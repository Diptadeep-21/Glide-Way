import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ChatWindow from './ChatWindow';

const BookingSummary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchBookingAndBus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Please log in to view booking');

        const bookingRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const bookingData = bookingRes.data;
        setBooking(bookingData);

        if (!bookingData.busId) throw new Error('Bus ID not found in booking data');

        const busRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/bus/${bookingData.busId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setBus(busRes.data.bus || busRes.data); // Ensure bus data is correctly set
        setLoading(false);
      } catch (error) {
        console.error('Fetch error:', error);
        setError(`Failed to fetch data: ${error.response?.data?.error || error.message}`);
        setLoading(false);
      }
    };

    fetchBookingAndBus();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (time) => {
    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return `${hours}:${minutes} ${month} ${day}`;
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-600">{error}</div>;
  if (!booking) return <div className="text-center py-10">No booking found.</div>;

  return (
    <div className="max-w-3xl mx-auto mt-20 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Booking Summary</h1>
      <p><strong>Booking ID:</strong> {booking._id}</p>
      <p><strong>Email:</strong> {booking.contactDetails?.email || 'N/A'}</p>
      <p><strong>Phone:</strong> {booking.contactDetails?.phone || 'N/A'}</p>
      <p><strong>Boarding Point:</strong> {booking.boardingPoint || bus?.source || 'N/A'}</p>
      <p><strong>Dropping Point:</strong> {bus?.destination || 'N/A'}</p>
      <p><strong>Travel Date:</strong> {booking.travelDate ? formatDate(booking.travelDate) : 'N/A'}</p>
      <p><strong>Departure:</strong> {bus?.departureTime ? formatTime(bus.departureTime) : 'N/A'}</p>
      <p><strong>Arrival:</strong> {bus?.destinationTime ? formatTime(bus.destinationTime) : 'N/A'}</p>
      <p><strong>Seats:</strong> {booking.seatsBooked?.join(', ') || 'N/A'}</p>
      <p><strong>Status:</strong> {booking.status || 'N/A'}</p>
      {booking.isGroupBooking && (
        <p><strong>Group Booking:</strong> Yes (Lead: {booking.contactDetails.email})</p>
      )}
      {booking.groupMembers?.length > 0 && (
        <p><strong>Group Members:</strong> {booking.groupMembers.map(m => m.email).join(', ')}</p>
      )}
      <p><strong>Social Travel:</strong> {booking.allowSocialTravel ? 'Enabled' : 'Disabled'}</p>
    
      <p className="font-semibold"><strong>Total Fare:</strong> ₹{booking.totalFare || 'N/A'}</p>
      {bus?.isTrackingEnabled && (
        <p className="mt-4">
          <strong>Track Bus:</strong>{' '}
          <Link
            to={`/track-bus/${booking.busId}/${booking._id}`}
            className="text-blue-600 underline hover:text-blue-800"
          >
            Live Tracking
          </Link>
        </p>
      )}
      <h2 className="mt-6 text-lg font-semibold">Passengers:</h2>
      {booking.passengers.map((p, i) => (
        <div key={i} className="border p-3 my-2 rounded">
          <p><strong>Name:</strong> {p.name}</p>
          <p><strong>Gender:</strong> {p.gender}</p>
          <p><strong>Age:</strong> {p.age}</p>
        </div>
      ))}
      <div className="mt-6 space-x-4">
        <button
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Print Ticket
        </button>
        <button
          onClick={() => navigate('/dashboard-passenger/bookings')}
          className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          View All Bookings
        </button>
        
      </div>
     
    </div>
  );
};

export default BookingSummary;