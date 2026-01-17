import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('https://glide-way-backend.onrender.com'); // Match the backend URL

const AssignedTrips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      const res = await fetch('https://glide-way-backend.onrender.com/api/bus/assigned', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      console.log('Fetched trips data:', data);
      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching assigned trips:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();

    // Join a "driverRoom" to receive updates for all assigned buses
    socket.emit('joinDriverRoom', 'driverRoom');
    console.log('Joined driver room: driverRoom');

    // Listen for tracking status updates
    socket.on('trackingStatusUpdate', (data) => {
      console.log('Received tracking status update in AssignedTrips:', data);
      setTrips((prevTrips) =>
        prevTrips.map((trip) =>
          trip._id === data.busId
            ? { ...trip, isTrackingEnabled: data.isTrackingEnabled }
            : trip
        )
      );
      // Immediately fetch the latest state to confirm
      fetchTrips();
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error in AssignedTrips:', err);
      setError('Failed to connect to live updates server. Please try again later.');
    });

    // Polling fallback to ensure state consistency
    const pollingInterval = setInterval(() => {
      fetchTrips();
    }, 15000); // Reduced to 15 seconds for faster updates

    return () => {
      socket.emit('leaveDriverRoom', 'driverRoom');
      console.log('Left driver room: driverRoom');
      socket.off('trackingStatusUpdate');
      socket.off('connect_error');
      clearInterval(pollingInterval);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-neutral-800 rounded shadow">
        <h2 className="text-xl font-semibold mb-4 text-violet-600">Assigned Trips</h2>
        <p className="text-gray-500 dark:text-gray-400">Loading trips...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white dark:bg-neutral-800 rounded shadow">
        <h2 className="text-xl font-semibold mb-4 text-violet-600">Assigned Trips</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-neutral-800 rounded shadow">
      <h2 className="text-xl font-semibold mb-4 text-violet-600">Assigned Trips</h2>
      {trips.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No assigned trips found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip) => (
            <div
              key={trip._id}
              className="p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg shadow hover:shadow-md transition-shadow duration-200"
            >
              <h3 className="text-lg font-semibold text-violet-600 dark:text-violet-400">
                {trip.busName} ({trip.busNumber})
              </h3>
              <p className="mt-2">
                <strong>Route:</strong> {trip.source} → {trip.destination}
              </p>
              <p>
                <strong>Date:</strong>{' '}
                {trip.date ? new Date(trip.date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }) : 'N/A'}
              </p>
              <p>
                <strong>Departure Time:</strong>{' '}
                {trip.departureTime
                  ? new Date(trip.departureTime).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : 'N/A'}
              </p>
              <p>
                <strong>Arrival Time:</strong>{' '}
                {trip.destinationTime
                  ? new Date(trip.destinationTime).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : 'N/A'}
              </p>
              <p>
                <strong>Total Seats:</strong> {trip.totalSeats || 'N/A'}
              </p>
              <p>
                <strong>Fare:</strong> ₹{trip.fare || 'N/A'}
              </p>
              <p>
                <strong>Tracking:</strong> {trip.isTrackingEnabled ? 'Active' : 'Inactive'}
              </p>
              {trip.imageUrl && (
                <div className="mt-2">
                  <img
                    src={trip.imageUrl}
                    alt={trip.busName}
                    className="w-full h-32 object-cover rounded"
                  />
                </div>
              )}
              <div className="mt-4">
                <button
                  onClick={() => navigate(`/driver-track/${trip._id}`)}
                  className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700"
                >
                  Track Bus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignedTrips;
