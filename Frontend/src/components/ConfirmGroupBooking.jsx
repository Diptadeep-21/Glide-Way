import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ConfirmGroupBooking = () => {
  const { bookingId, email } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);

  useEffect(() => {
  const fetchBookingDetails = async () => {
  try {
    const token = localStorage.getItem('token');
    let response;

    if (token) {
      response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bookings/${bookingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } else {
      console.log('No token found. Proceeding as guest.');
      response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bookings/public/${bookingId}`
      );
    }

    setBookingDetails(response.data);
    setLoading(false);
  } catch (err) {
    console.error('Error fetching booking details:', err);
    setError(err.response?.data?.error || 'Failed to load booking details.');
    setLoading(false);
  }
};


    fetchBookingDetails();
  }, [bookingId, email, navigate]);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bookings/${bookingId}/confirm-group`,
        { email },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );

      setSuccess(true);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Error confirming group booking:', err);
      setError(err.response?.data?.error || 'Failed to confirm group booking.');
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-600">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto mt-20 p-6 border rounded shadow bg-neutral-100 dark:bg-neutral-700">
      <h1 className="text-2xl font-bold mb-6 text-neutral-800 dark:text-neutral-100">
        Confirm Group Booking
      </h1>
      {success ? (
        <div className="p-4 bg-green-100 text-green-800 border border-green-300 rounded-md">
          ✅ Group booking participation confirmed successfully!
          <p className="mt-2">
  {localStorage.getItem('token') ? (
    <button
      onClick={() => navigate('/dashboard-passenger/bookings')}
      className="text-blue-600 hover:underline"
    >
      View your bookings
    </button>
  ) : (
    <button
      onClick={() =>
        navigate('/login', {
          state: { from: '/dashboard-passenger/bookings' },
        })
      }
      className="text-blue-600 hover:underline"
    >
      Log in to view your bookings
    </button>
  )}
</p>

        </div>
      ) : (
        <>
          {bookingDetails && (
            <div className="space-y-4">
              <p><strong>Booking ID:</strong> {bookingDetails._id}</p>
              <p><strong>Route:</strong> {bookingDetails.busDetails?.source || 'N/A'} to {bookingDetails.busDetails?.destination || 'N/A'}</p>
              <p><strong>Travel Date:</strong> {bookingDetails.travelDate ? new Date(bookingDetails.travelDate).toLocaleDateString('en-IN') : 'N/A'}</p>
              <p><strong>Seats:</strong> {bookingDetails.seatsBooked?.join(', ') || 'N/A'}</p>
              <p><strong>Group Lead Email:</strong> {bookingDetails.contactDetails?.email || 'N/A'}</p>
              <p><strong>Your Email:</strong> {email}</p>
            </div>
          )}
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">
            You have been invited to join a group booking. Please confirm your participation below.
          </p>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`mt-4 px-6 py-2 rounded-md text-white font-semibold transition-colors ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {loading ? 'Confirming...' : 'Confirm Participation'}
          </button>
        </>
      )}
    </div>
  );
};

export default ConfirmGroupBooking;