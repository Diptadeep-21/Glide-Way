import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import ChatWithDriver from './ChatWithDriver';
import JourneyRating from './JourneyRating';
import ErrorBoundary from './ErrorBoundary';
import AmenityFeedbackForm from './AmenityFeedbackForm';
import GroupChat from './GroupChat';
import { motion, AnimatePresence } from 'framer-motion';

const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [buses, setBuses] = useState({});
  const [socialData, setSocialData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChatBookingId, setActiveChatBookingId] = useState(null);
  const [activeGroupChatBookingId, setActiveGroupChatBookingId] = useState(null);
  const [showPast, setShowPast] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rateAmenitiesBookingId, setRateAmenitiesBookingId] = useState(null);
  const [rateJourneyBookingId, setRateJourneyBookingId] = useState(null);
  const [showFeedbackSuccess, setShowFeedbackSuccess] = useState(false);

  const navigate = useNavigate();

  let userId = null;
  let userEmail = null;
  const token = localStorage.getItem('token');
  if (token && token !== 'null' && token !== 'undefined') {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        localStorage.removeItem('token');
        setError('Your session has expired. Please log in again.');
        setLoading(false);
        navigate('/login', { state: { from: '/my-bookings' } });
      } else {
        userId = payload?.id || payload?._id || payload?.userId;
        userEmail = payload?.email;
        if (!userId) throw new Error('User ID missing in token');
      }
    } catch (err) {
      console.error('Failed to decode token:', err.message);
      localStorage.removeItem('token');
      setError('Invalid token. Please log in again.');
      setLoading(false);
      navigate('/login', { state: { from: '/my-bookings' } });
    }
  } else {
    setError('Please log in to view your bookings.');
    setLoading(false);
    navigate('/login', { state: { from: '/my-bookings' } });
  }

  const fetchBookings = async () => {
    try {
      const bookingsResponse = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bookings/mybookings`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const bookingsData = bookingsResponse.data.bookings || [];
      setBookings(bookingsData);

      const busPromises = bookingsData
        .filter(booking => booking.busId)
        .map(booking =>
          axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bus/${booking.busId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ).catch(err => ({ data: null }))
        );
      const busResponses = await Promise.all(busPromises);
      const busesData = busResponses.reduce((acc, res, index) => {
        if (res.data) acc[bookingsData[index].busId] = res.data.bus;
        return acc;
      }, {});
      setBuses(busesData);

      const socialPromises = bookingsData
        .filter(booking => booking.busId && booking.allowSocialTravel)
        .map(booking =>
          axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bookings/social/${booking.busId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ).catch(err => ({ data: null }))
        );
      const socialResponses = await Promise.all(socialPromises);
      const socialDataTemp = socialResponses.reduce((acc, res, index) => {
        if (res.data) acc[bookingsData[index].busId] = res.data;
        return acc;
      }, {});
      setSocialData(socialDataTemp);

      setLoading(false);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load bookings. Please try again later.');
      setLoading(false);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login', { state: { from: '/my-bookings' } });
      }
    }
  };

  useEffect(() => {
    if (!userId) return;

    fetchBookings();

    bookings.forEach(booking => {
      socket.emit('joinRoom', { bookingId: booking._id });
      if (booking.allowSocialTravel && booking.busId) {
        socket.emit('joinBusRoom', { busId: booking.busId, bookingId: booking._id, userId });
      }
    });

    socket.on('bookingStatusUpdate', ({ bookingId, status, isChatEnabled, cancellationReason }) => {
      setBookings(prev =>
        prev.map(booking =>
          booking._id === bookingId ? { ...booking, status, isChatEnabled, cancellationReason } : booking
        )
      );
    });

    socket.on('groupMessage', ({ busId, bookingId, senderId, message, timestamp }) => {
      console.log(`Received group message for bus ${busId}:`, message);
    });

    socket.on('delayNoticeUpdate', ({ bookingId, delayNotice }) => {
      setBookings(prev =>
        prev.map(booking =>
          booking._id === bookingId ? { ...booking, delayNotice } : booking
        )
      );
    });


    const savedChatId = localStorage.getItem('activeChatBookingId');
    if (savedChatId) setActiveChatBookingId(savedChatId);

    return () => {
      bookings.forEach(booking => {
        socket.emit('leaveRoom', { bookingId: booking._id });
        if (booking.allowSocialTravel && booking.busId) {
          socket.emit('leaveBusRoom', { busId: booking.busId });
        }
      });
      socket.off('bookingStatusUpdate');
      socket.off('groupMessage');
    };
  }, [userId, navigate, token]);

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
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const toggleChat = (bookingId) => {
    const newId = activeChatBookingId === bookingId ? null : bookingId;
    setActiveChatBookingId(newId);
    if (newId) localStorage.setItem('activeChatBookingId', newId);
    else localStorage.removeItem('activeChatBookingId');
  };

  const toggleGroupChat = (bookingId) => {
    const newId = activeGroupChatBookingId === bookingId ? null : bookingId;
    setActiveGroupChatBookingId(newId);
  };

  const handleCancelBooking = async (bookingId) => {
    if (!cancelReason || cancelReason.trim().length < 3) {
      alert('Cancellation reason must be at least 3 characters long.');
      return;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bookings/${bookingId}/cancel`,
        { reason: cancelReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(res.data.message || 'Booking cancelled successfully');
      setBookings(prev =>
        prev.map(b =>
          b._id === bookingId ? { ...b, status: 'cancelled', isChatEnabled: false, cancellationReason: cancelReason.trim() } : b
        )
      );
      setCancelBookingId(null);
      setCancelReason('');
    } catch (err) {
      console.error('Cancel error:', err);
      alert(err.response?.data?.error || 'Failed to cancel booking. Try again later.');
    }
  };

  const handleRatingSubmitted = (bookingId, ratingData) => {
    setBookings(prev =>
      prev.map(booking =>
        booking._id === bookingId ? { ...booking, ratingId: true, rating: ratingData } : booking
      )
    );
    setRateJourneyBookingId(null);
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

  const now = Date.now();
  const upcomingBookings = bookings.filter(b => new Date(b.destinationTime).getTime() > now);
  const pastBookings = bookings.filter(b => new Date(b.destinationTime).getTime() <= now);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-neutral-900 min-h-screen pt-16"
    >
      <div className="max-w-full mx-auto">
        <h2 className="text-3xl font-bold text-violet-600 dark:text-violet-400 mb-6">My Bookings</h2>

        <AnimatePresence>
          {showFeedbackSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mb-6 p-4 rounded-lg bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700 shadow-sm"
            >
              ✅ Amenity feedback submitted successfully!
            </motion.div>
          )}
        </AnimatePresence>

        {userId && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            Viewing bookings for user ID: {userId}
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

        <div>
          <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Upcoming Bookings</h3>
          {upcomingBookings.length === 0 ? (
            <p className="text-neutral-600 dark:text-neutral-400">
              No upcoming bookings found.{' '}
              <button onClick={() => navigate('/')} className="text-violet-600 hover:underline font-medium">
                Book a bus now!
              </button>
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingBookings.map((booking) => {
                const bus = buses[booking.busId] || {};
                const social = socialData[booking.busId] || { passengers: [], groupChatRoomId: null };
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
                          <strong>Bus:</strong> {booking.busDetails?.busName || 'N/A'} ({booking.busDetails?.busNumber || 'N/A'})
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          <strong>Route:</strong> {bus.source || 'N/A'} to {bus.destination || 'N/A'}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          <strong>Seats:</strong> {booking.seatsBooked.join(', ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          <strong>Travel Date:</strong> {formatDate(booking.travelDate)}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          <strong>Departure:</strong> {booking.departureTime ? formatTime(booking.departureTime) : 'N/A'}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          <strong>Total Fare:</strong> ₹{booking.totalFare}
                        </p>
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          <strong>Status:</strong>{' '}
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </p>
                        {booking.status === 'cancelled' && booking.cancellationReason && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            <strong>Cancellation Reason:</strong> {booking.cancellationReason}
                          </p>
                        )}

                        {booking.delayNotice && booking.delayNotice.trim() && (
                          <p className="text-sm text-yellow-700 dark:text-yellow-400">
                            <strong>Delay Notice:</strong> {booking.delayNotice}
                          </p>
                        )}


                        {booking.isGroupBooking && (
                          <>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <strong>Group Booking:</strong> Yes ({booking.groupSize} members)
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <strong>Group Members:</strong>{' '}
                              {booking.groupMembers?.map(m => m.email || 'Pending').join(', ')}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {bus.isTrackingEnabled &&
                        
                        new Date(booking.destinationTime) >= new Date() && (
                          <Link
                            to={`/track-bus/${booking.busId}/${booking._id}`}
                            className="px-4 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors duration-200"
                          >
                            Track Bus
                          </Link>
                        )}


                      {(booking?.isChatEnabled ?? true) && (
                        <button
                          onClick={() => toggleChat(booking._id)}
                          className="px-4 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors duration-200"
                          disabled={!userId || !booking._id}
                        >
                          {activeChatBookingId === booking._id ? 'Close Chat' : 'Chat with Driver'}
                        </button>
                      )}
                      {booking.allowSocialTravel && booking.isGroupBooking && (
                        <button
                          onClick={() => toggleGroupChat(booking._id)}
                          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
                        >
                          {activeGroupChatBookingId === booking._id ? 'Close Group Chat' : 'Join Group Chat'}
                        </button>
                      )}
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => setCancelBookingId(booking._id)}
                          className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

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
                  {pastBookings.map((booking) => {
                    const bus = buses[booking.busId] || {};
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
                              <strong>Bus:</strong> {booking.busDetails?.busName || 'N/A'} ({booking.busDetails?.busNumber || 'N/A'})
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <strong>Route:</strong> {bus.source || 'N/A'} to {bus.destination || 'N/A'}
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <strong>Seats:</strong> {booking.seatsBooked.join(', ')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <strong>Travel Date:</strong> {formatDate(booking.travelDate)}
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <strong>Departure:</strong> {booking.busDetails?.departureTime ? formatTime(bus.departureTime) : 'N/A'}
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <strong>Total Fare:</strong> ₹{booking.totalFare}
                            </p>
                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                              <strong>Status:</strong>{' '}
                              <span className={`inline-block px-2 py-1 rounded-full text-xs ${booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </p>
                            {booking.status === 'cancelled' && booking.cancellationReason && (
                              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                <strong>Cancellation Reason:</strong> {booking.cancellationReason}
                              </p>
                            )}
                            {booking.delayNotice && booking.delayNotice.trim() && (
                              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                <strong>Delay Notice:</strong> {booking.delayNotice}
                              </p>
                            )}

                            {booking.isGroupBooking && (
                              <>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                  <strong>Group Booking:</strong> Yes ({booking.groupSize} members)
                                </p>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                  <strong>Group Members:</strong>{' '}
                                  {booking.groupMembers?.map(m => m.email || 'Pending').join(', ')}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 space-y-6">
                          {/* Amenity Rating */}
                          <div>
                            {booking.status === 'completed' && booking.amenityRatings && booking.amenityRatings.length > 0 ? (
                              <div className="rating-card p-4 rounded-md bg-emerald-50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700">
                                <p className="text-green-700 dark:text-green-300 font-semibold mb-3">✅ Amenity Feedback</p>
                                <div className="space-y-3">
                                  {booking.amenityRatings.map((rating, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                      <span className="font-medium capitalize text-neutral-700 dark:text-neutral-300">{rating.amenity}</span>
                                      <span className="text-yellow-500 mt-1 sm:mt-0">
                                        {'★'.repeat(rating.rating) + '☆'.repeat(5 - rating.rating)}
                                      </span>
                                      {rating.comment && (
                                        <p className="text-sm italic text-neutral-500 dark:text-neutral-400 mt-1 sm:ml-4">“{rating.comment}”</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : booking.status === 'completed' ? (
                              <button
                                onClick={() => setRateAmenitiesBookingId(booking._id)}
                                className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors duration-200"
                              >
                                {booking.amenityRatings?.length > 0 ? 'View Amenity Ratings' : 'Rate Amenities'}
                              </button>

                            ) : (
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
                                You can rate amenities after your journey is completed.
                              </p>
                            )}
                          </div>

                          {/* Journey Rating */}
                          <div>
                            {booking.status === 'completed' && booking.ratingId && booking.rating ? (
                              <div className="rating-card p-4 rounded-md bg-emerald-50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700">
                                <p className="text-green-700 dark:text-green-300 font-semibold mb-3">✅ Journey Rating</p>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                  <span className="font-medium text-neutral-700 dark:text-neutral-300">Journey</span>
                                  <span className="text-yellow-500 mt-1 sm:mt-0">
                                    {'★'.repeat(booking.rating.rating) + '☆'.repeat(5 - booking.rating.rating)}
                                  </span>
                                  {booking.rating.comment && (
                                    <p className="text-sm italic text-neutral-500 dark:text-neutral-400 mt-1 sm:ml-4">“{booking.rating.comment}”</p>
                                  )}
                                </div>
                              </div>
                            ) : booking.status === 'completed' ? (
                              <button
                                onClick={() => setRateJourneyBookingId(booking._id)}
                                className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors duration-200 mt-2"
                              >
                                {booking.ratingId ? 'View Journey Ratings' : 'Rate Your Journey'}
                              </button>

                            ) : (
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
                                You can rate your journey after it is completed.
                              </p>
                            )}
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel Booking Modal */}
        <AnimatePresence>
          {cancelBookingId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => {
                setCancelBookingId(null);
                setCancelReason('');
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
                    setCancelBookingId(null);
                    setCancelReason('');
                  }}
                  className="absolute top-4 right-4 text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h4 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Cancel Booking</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">
                      Reason for Cancellation
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 dark:text-white focus:ring-2 focus:ring-violet-500 transition-colors duration-200"
                      rows="4"
                      placeholder="Enter reason (minimum 3 characters)"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => handleCancelBooking(cancelBookingId)}
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
                      disabled={cancelReason.trim().length < 3}
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => {
                        setCancelBookingId(null);
                        setCancelReason('');
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

        {/* Rate Amenities Modal */}
<AnimatePresence>
  {rateAmenitiesBookingId && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 sm:px-6"
      onClick={() => setRateAmenitiesBookingId(null)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setRateAmenitiesBookingId(null)}
          className="absolute top-4 right-4 text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h4 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Rate Amenities</h4>
        <ErrorBoundary>
          <AmenityFeedbackForm
            bookingId={rateAmenitiesBookingId}
            onSubmit={(submittedRatings) => {
              setBookings(prev =>
                prev.map(b =>
                  b._id === rateAmenitiesBookingId
                    ? { ...b, amenityRatings: submittedRatings }
                    : b
                )
              );
              setRateAmenitiesBookingId(null);
              setShowFeedbackSuccess(true);
              setTimeout(() => setShowFeedbackSuccess(false), 3000);
            }}
          />
        </ErrorBoundary>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

        {/* Rate Journey Modal */}
        <AnimatePresence>
          {rateJourneyBookingId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => setRateJourneyBookingId(null)}
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
                  onClick={() => setRateJourneyBookingId(null)}
                  className="absolute top-4 right-4 text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h4 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Rate Your Journey</h4>
                <ErrorBoundary>
                  <JourneyRating
                    bookingId={rateJourneyBookingId}
                    userId={userId}
                    bookingStatus="completed"
                    onRatingSubmitted={(ratingData) => handleRatingSubmitted(rateJourneyBookingId, ratingData)}
                  />
                </ErrorBoundary>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Driver Chat Modal */}
        <AnimatePresence>
          {activeChatBookingId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => toggleChat(activeChatBookingId)}
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
                  onClick={() => toggleChat(activeChatBookingId)}
                  className="absolute top-4 right-4 text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h4 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Chat with Driver</h4>
                <ErrorBoundary>
                  <ChatWithDriver bookingId={activeChatBookingId} userId={userId} />
                </ErrorBoundary>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Group Chat Modal */}
        <AnimatePresence>
          {activeGroupChatBookingId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => toggleGroupChat(activeGroupChatBookingId)}
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
                  onClick={() => toggleGroupChat(activeGroupChatBookingId)}
                  className="absolute top-4 right-4 text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h4 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Group Chat</h4>
                <ErrorBoundary>
                  <GroupChat
                    busId={bookings.find(b => b._id === activeGroupChatBookingId)?.busId}
                    bookingId={activeGroupChatBookingId}
                    userId={userId}
                    userEmail={userEmail}
                    passengers={
                      (socialData[bookings.find(b => b._id === activeGroupChatBookingId)?.busId]?.passengers || [])
                        .filter(p => p.bookingId === activeGroupChatBookingId)
                    }
                  />
                </ErrorBoundary>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MyBookings;