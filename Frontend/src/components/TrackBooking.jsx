import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DriverChat from './DriverChat';
import ErrorBoundaryDriver from './ErrorBoundaryDriver';
import { motion, AnimatePresence } from 'framer-motion';

const TrackBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [completeJourneyBookingId, setCompleteJourneyBookingId] = useState(null);
  const [formData, setFormData] = useState({ actualDepartureTime: '', actualArrivalTime: '', earnings: '' });
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token || token === 'null' || token === 'undefined') {
      setError('Please log in to view your bookings.');
      setLoading(false);
      navigate('/login', { state: { from: '/track-booking' } });
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        localStorage.removeItem('token');
        setError('Your session has expired. Please log in again.');
        setLoading(false);
        navigate('/login', { state: { from: '/track-booking' } });
        return;
      }
      const id = payload.id || payload._id || payload.userId;
      if (!id) throw new Error('User ID missing in token');
      setUserId(id);
      setUserRole(payload.role || '');
    } catch (err) {
      console.error('Error decoding token:', err.message);
      localStorage.removeItem('token');
      setError('Invalid token format. Please log in again.');
      setLoading(false);
      navigate('/login', { state: { from: '/track-booking' } });
      return;
    }

    const fetchBookings = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/bookings/mybookings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setBookings(data.bookings || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching bookings:', err.message);
        setError('Failed to load bookings. Please try again later.');
        setLoading(false);
      }
    };

    fetchBookings();
  }, [navigate, token]);

  useEffect(() => {
    if (!userId) return;
    const savedId = localStorage.getItem('activeChatBookingId');
    if (savedId) setSelectedBookingId(savedId);
  }, [userId]);

  const handleChatClick = (bookingId) => {
    const newId = selectedBookingId === bookingId ? null : bookingId;
    setSelectedBookingId(newId);

    if (newId) {
      localStorage.setItem('activeChatBookingId', newId);
    } else {
      localStorage.removeItem('activeChatBookingId');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCompleteJourney = async (bookingId) => {
    try {
      const earnings = parseFloat(formData.earnings);
      if (isNaN(earnings) || earnings < 0) {
        throw new Error('Please enter a valid earnings amount.');
      }

      const response = await fetch(`http://localhost:5000/api/bookings/${bookingId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actualDepartureTime: formData.actualDepartureTime,
          actualArrivalTime: formData.actualArrivalTime,
          earnings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark journey as completed');
      }

      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking._id === bookingId
            ? {
              ...booking,
              status: 'completed',
              actualDepartureTime: formData.actualDepartureTime,
              actualArrivalTime: formData.actualArrivalTime,
              earnings,
            }
            : booking
        )
      );

      setCompleteJourneyBookingId(null);
      setFormData({ actualDepartureTime: '', actualArrivalTime: '', earnings: '' });
      setError(null);
      alert(`Journey marked as completed successfully. Earnings recorded: ₹${earnings.toLocaleString('en-IN')}`);
    } catch (err) {
      console.error('Error completing journey:', err.message);
      setError(err.message);
    }
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const date = new Date(time);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-neutral-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-violet-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-neutral-900">
        <div className="p-6 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg shadow-lg">
          {error}
        </div>
      </div>
    );
  }

  const today = new Date();
  const upcomingBookings = bookings.filter(booking =>
    new Date(booking.destinationTime).getTime() > Date.now()
  );
  const pastBookings = bookings.filter(booking =>
    new Date(booking.destinationTime).getTime() <= Date.now()
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-neutral-900 min-h-screen pt-16"
    >
      <div className="max-w-full mx-auto">
        <h2 className="text-3xl font-bold text-violet-600 dark:text-violet-400 mb-6">Track Bookings</h2>

        {userId && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            Viewing bookings for buses assigned to you (Driver ID: {userId})
          </p>
        )}

        <div className="mb-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPast}
              onChange={() => setShowPast(!showPast)}
              className="form-checkbox h-5 w-5 text-violet-600 rounded focus:ring-violet-500"
            />
            <span className="text-neutral-700 dark:text-neutral-300 font-medium">Show past bookings</span>
          </label>
        </div>

        {/* Upcoming Bookings */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Upcoming Bookings</h3>
          {upcomingBookings.length === 0 ? (
            <p className="text-neutral-600 dark:text-neutral-400">No upcoming bookings found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingBookings.map(booking => {
                const travelDate = new Date(booking.travelDate);
                const destinationTime = new Date(booking.destinationTime);
                const now = new Date();

                const canCompleteJourney =
                  userRole === 'driver' &&
                  booking.status === 'confirmed' &&
                  destinationTime <= now;


                return (
                  <motion.div
                    key={booking._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 bg-white dark:bg-neutral-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 w-full"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          <strong>Booking ID:</strong> {booking._id}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          <strong>Passenger(s):</strong> {booking.passengers.map(p => p.name).join(', ')}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          <strong>Bus:</strong> {booking.busDetails?.busName || 'N/A'} ({booking.busDetails?.busNumber || 'N/A'})
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          <strong>Seat(s):</strong> {booking.seatsBooked.join(', ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          <strong>Travel Date:</strong> {travelDate.toLocaleDateString('en-IN')}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          <strong>Scheduled Departure:</strong> {formatTime(booking.departureTime)}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          <strong>Scheduled Arrival:</strong> {formatTime(booking.destinationTime)}
                        </p>
                        {booking.actualDepartureTime && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            <strong>Actual Departure:</strong> {formatTime(booking.actualDepartureTime)}
                          </p>
                        )}
                        {booking.actualArrivalTime && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            <strong>Actual Arrival:</strong> {formatTime(booking.actualArrivalTime)}
                          </p>
                        )}
                        {booking.earnings && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            <strong>Earnings:</strong> ₹{booking.earnings.toLocaleString('en-IN')}
                          </p>
                        )}
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          <strong>Status:</strong>{' '}
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${booking.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(booking?.isChatEnabled ?? true) && (
                        <button
                          onClick={() => handleChatClick(booking._id)}
                          className="px-4 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors duration-200"
                        >
                          {selectedBookingId === booking._id ? 'Close Chat' : 'Open Chat'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const reason = prompt('Enter delay reason:');
                          if (reason && reason.length >= 5) {
                            fetch(`https://glide-way-backend.onrender.com/api/bookings/${booking._id}/delay`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ delayNotice: reason })
                            }).then(res => res.json())
                              .then(data => alert(data.message || 'Notice sent'))
                              .catch(err => console.error(err));
                          }
                        }}
                        className="px-4 py-2 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors duration-200"
                      >
                        Report Delay
                      </button>


                      {canCompleteJourney && (
                        <button
                          onClick={() => setCompleteJourneyBookingId(booking._id)}
                          className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                          disabled={booking.status === 'completed'}
                        >
                          Mark as Completed
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Bookings */}
        <AnimatePresence>
          {showPast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5 }}
              className="mt-8"
            >
              <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Past Bookings</h3>
              {pastBookings.length === 0 ? (
                <p className="text-neutral-600 dark:text-neutral-400">No past bookings found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastBookings.map(booking => {
                    const travelDate = new Date(booking.travelDate);
                    const canCompleteJourney =
                      userRole === 'driver' &&
                      booking.status === 'confirmed' &&
                      travelDate <= today;

                    return (
                      <motion.div
                        key={booking._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="p-6 bg-white dark:bg-neutral-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 w-full"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                              <strong>Booking ID:</strong> {booking._id}
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <strong>Passenger(s):</strong> {booking.passengers.map(p => p.name).join(', ')}
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <strong>Bus:</strong> {booking.busDetails?.busName || 'N/A'} ({booking.busDetails?.busNumber || 'N/A'})
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <strong>Seat(s):</strong> {booking.seatsBooked.join(', ')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <strong>Travel Date:</strong> {travelDate.toLocaleDateString('en-IN')}
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <strong>Scheduled Departure:</strong> {formatTime(booking.busDetails?.departureTime)}
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <strong>Scheduled Arrival:</strong> {formatTime(booking.busDetails?.destinationTime)}
                            </p>
                            {booking.actualDepartureTime && (
                              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                <strong>Actual Departure:</strong> {formatTime(booking.actualDepartureTime)}
                              </p>
                            )}
                            {booking.actualArrivalTime && (
                              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                <strong>Actual Arrival:</strong> {formatTime(booking.actualArrivalTime)}
                              </p>
                            )}
                            {booking.earnings && (
                              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                <strong>Earnings:</strong> ₹{booking.earnings.toLocaleString('en-IN')}
                              </p>
                            )}
                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                              <strong>Status:</strong>{' '}
                              <span className={`inline-block px-2 py-1 rounded-full text-xs ${booking.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {canCompleteJourney && (
                            <button
                              onClick={() => setCompleteJourneyBookingId(booking._id)}
                              className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                              disabled={booking.status === 'completed'}
                            >
                              Mark as Completed
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Modal */}
        <AnimatePresence>
          {selectedBookingId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => handleChatClick(selectedBookingId)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-lg sm:max-w-xl md:max-w-2xl p-6 relative"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => handleChatClick(selectedBookingId)}
                  className="absolute top-4 right-4 text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h4 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Driver Chat</h4>
                <ErrorBoundaryDriver>
                  <DriverChat bookingId={selectedBookingId} userId={userId} />
                </ErrorBoundaryDriver>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Complete Journey Modal */}
        <AnimatePresence>
          {completeJourneyBookingId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => {
                setCompleteJourneyBookingId(null);
                setFormData({ actualDepartureTime: '', actualArrivalTime: '', earnings: '' });
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-lg p-6 relative"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setCompleteJourneyBookingId(null);
                    setFormData({ actualDepartureTime: '', actualArrivalTime: '', earnings: '' });
                  }}
                  className="absolute top-4 right-4 text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h4 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Enter Journey Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                      Actual Departure Time
                    </label>
                    <input
                      type="datetime-local"
                      name="actualDepartureTime"
                      value={formData.actualDepartureTime}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 dark:text-white focus:ring-2 focus:ring-violet-500 transition-colors duration-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                      Actual Arrival Time
                    </label>
                    <input
                      type="datetime-local"
                      name="actualArrivalTime"
                      value={formData.actualArrivalTime}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 dark:text-white focus:ring-2 focus:ring-violet-500 transition-colors duration-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                      Earnings (₹)
                    </label>
                    <input
                      type="number"
                      name="earnings"
                      value={formData.earnings}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 dark:text-white focus:ring-2 focus:ring-violet-500 transition-colors duration-200"
                      min="0"
                      step="1"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => handleCompleteJourney(completeJourneyBookingId)}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                      disabled={
                        !formData.actualDepartureTime ||
                        !formData.actualArrivalTime ||
                        !formData.earnings ||
                        parseFloat(formData.earnings) < 0
                      }
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => {
                        setCompleteJourneyBookingId(null);
                        setFormData({ actualDepartureTime: '', actualArrivalTime: '', earnings: '' });
                      }}
                      className="px-6 py-2 bg-gray-300 dark:bg-neutral-600 text-black dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-neutral-500 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TrackBooking;