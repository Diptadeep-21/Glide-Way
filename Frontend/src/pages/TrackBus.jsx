import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import geolocationService from '../services/geolocationService';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

const TrackBus = () => {
  const { busId, bookingId } = useParams();
  const [bus, setBus] = useState(null);
  const [location, setLocation] = useState(null);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [socket, setSocket] = useState(null);

  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

  const fetchBusData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      // Fetch user role
      const userRes = await axios.get(`${serverUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserRole(userRes.data.role);

      // Fetch bus data
      const busRes = await axios.get(`${serverUrl}/api/bus/${busId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('TrackBus.jsx: Fetched bus data:', busRes.data);
      setBus(busRes.data.bus);
      setIsTrackingEnabled(busRes.data.bus.isTrackingEnabled);
      setLocation(busRes.data.bus.isTrackingEnabled ? busRes.data.bus.currentLocation : null);
    } catch (err) {
      console.error('TrackBus.jsx: Error fetching bus data:', err.response?.data || err.message);
      setError('Failed to load bus data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user role and bus data initially
  useEffect(() => {
    console.log('TrackBus.jsx: Initializing for busId:', busId, 'bookingId:', bookingId);
    fetchBusData();
  }, [busId, bookingId]);

  // Initialize socket only after userRole is known
  useEffect(() => {
    if (!userRole) return; // Wait for userRole before connecting

    const newSocket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      query: { role: userRole },
    });

    setSocket(newSocket);

    return () => {
      geolocationService.stopTracking();
      if (newSocket) {
        newSocket.emit('leaveBusRoom', busId);
        newSocket.disconnect();
      }
    };
  }, [userRole, busId]);


  useEffect(() => {
    if (!socket) return;

    const setupSocketListeners = () => {
      socket.on('connect', () => {
        console.log('TrackBus.jsx: Socket.IO connected:', socket.id);
        socket.emit('joinBusRoom', busId);
        if (isTrackingEnabled && userRole === 'driver') {
          geolocationService.startTracking(busId, socket);
        }
      });

      socket.on('connect_error', (err) => {
        console.error('TrackBus.jsx: Socket.IO connection error:', err.message);
        setError('Connection to live tracking failed. Retrying...');
      });

      socket.on('reconnect_attempt', (attempt) => {
        console.warn(`TrackBus.jsx: Reconnection attempt #${attempt}`);
      });

      socket.on('reconnect', () => {
        console.log('TrackBus.jsx: Reconnected to Socket.IO');
        socket.emit('joinBusRoom', busId);
        if (isTrackingEnabled && userRole === 'driver') {
          geolocationService.startTracking(busId, socket);
        }
      });

      socket.on('locationUpdate', (data) => {
        console.log('TrackBus.jsx: Received location update:', data);
        if (data.busId === busId) {
          setLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: data.timestamp,
          });
        }
      });

      socket.on('trackingStatusUpdate', ({ busId: updatedId, isTrackingEnabled: newStatus }) => {
        if (updatedId === busId) {
          console.log('TrackBus.jsx: Tracking status updated:', newStatus);
          setIsTrackingEnabled(newStatus);
          if (newStatus && userRole === 'driver') {
            geolocationService.startTracking(busId, socket);
          } else {
            geolocationService.stopTracking();
            setLocation(null);
          }
          // Re-fetch bus data to ensure sync
          fetchBusData();
        }
      });
    };

    setupSocketListeners();

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('reconnect_attempt');
      socket.off('reconnect');
      socket.off('locationUpdate');
      socket.off('trackingStatusUpdate');
    };
  }, [socket, busId, isTrackingEnabled, userRole]);

  useEffect(() => {
    if (
      userRole === 'driver' &&
      isTrackingEnabled &&
      socket &&
      socket.connected
    ) {
      console.log('TrackBus.jsx: Auto-starting tracking after refresh/reconnect');
      geolocationService.startTracking(busId, socket);
    }
  }, [userRole, isTrackingEnabled, socket]);


  const toggleTracking = async () => {
    try {
      const token = localStorage.getItem('token');
      const newTrackingStatus = !isTrackingEnabled;
      console.log('TrackBus.jsx: Toggling tracking to:', newTrackingStatus);

      const response = await axios.put(
        `${serverUrl}/api/bus/${busId}/tracking`,
        { isTrackingEnabled: newTrackingStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('TrackBus.jsx: Tracking toggle response:', response.data);

      // Re-fetch bus data to sync state
      await fetchBusData();

      // Update socket and geolocation based on new status
      if (newTrackingStatus && userRole === 'driver') {
        geolocationService.startTracking(busId, socket);
      } else {
        geolocationService.stopTracking();
        setLocation(null);
      }
    } catch (err) {
      console.error('TrackBus.jsx: Error toggling tracking:', err.response?.data || err.message);
      setError('Failed to update tracking status. Please try again.');
    }
  };


  if (loading) return <p className="text-center py-8">Loading...</p>;
  if (error) return <p className="text-center py-8 text-red-600">{error}</p>;

  return (
    <div className="w-full lg:px-28 md:px-16 sm:px-7 px-4 mt-12 mb-8">
      <h2 className="text-2xl font-semibold text-violet-600">Track Bus</h2>
      <div className="mt-4 border p-6 rounded-lg bg-white dark:bg-neutral-800 shadow-sm">
        <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
          {bus?.source} to {bus?.destination}
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Status: {isTrackingEnabled ? 'Tracking Active' : 'Tracking Disabled'}
        </p>

        {(userRole === 'driver' || userRole === 'admin') && (
          <button
            className={`mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium ${isTrackingEnabled
              ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
              : 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
              }`}
            onClick={toggleTracking}
            disabled={!socket || !socket.connected || loading}
          >
            {isTrackingEnabled ? 'Stop Tracking' : 'Start Tracking'}
          </button>
        )}

        {isTrackingEnabled && location?.latitude && location?.longitude ? (
          <div className="mt-6">
            <div className="relative w-full h-96 rounded-lg overflow-hidden z-0">
              <MapContainer
                center={[location.latitude, location.longitude]}
                zoom={13}
                scrollWheelZoom={false}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[location.latitude, location.longitude]}>
                  <Popup>
                    Bus Location<br />
                    Lat: {location.latitude.toFixed(4)}, Lng: {location.longitude.toFixed(4)}<br />
                    Updated: {new Date(location.timestamp).toLocaleString()}
                  </Popup>
                </Marker>
              </MapContainer>
            </div>

          </div>
        ) : (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            {isTrackingEnabled ? 'Waiting for location update...' : 'Live tracking is not enabled for this bus.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default TrackBus;