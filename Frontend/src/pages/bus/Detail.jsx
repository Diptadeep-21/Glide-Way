import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaStar, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import SeatLayout54 from '../../components/seat/SeatLayout54';
import SeatLayout45 from '../../components/seat/SeatLayout45';
import axios from 'axios';

const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');

function isUserLoggedIn() {
  const token = localStorage.getItem('token');
  if (!token || token === 'null' || token === 'undefined') return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      localStorage.removeItem('token');
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const getWindowSeats = (totalSeats) => {
  if (totalSeats === 54) {
    return [
      ...Array.from({ length: 11 }, (_, i) => i + 1),
      ...Array.from({ length: 10 }, (_, i) => i + 45),
    ];
  } else if (totalSeats === 45) {
    return [
      ...Array.from({ length: 11 }, (_, i) => i + 1), // Seats 1–9
      ...Array.from({ length: 11 }, (_, i) => i + 37), // Seats 37–45
    ];
  }
  return [];
};

const calculateDynamicFare = (baseFare, selectedSeats, busData, travelDate) => {
  if (!busData || !busData.totalSeats || !baseFare) {
    return { totalFare: 0, baseFare: 0, dynamicSurcharge: 0, windowSeatSurcharge: 0, groupDiscount: 0, breakdown: {} };
  }

  const { totalSeats, bookedSeats = [] } = busData;
  const availableSeats = totalSeats - bookedSeats.length;
  const bookedPercentage = bookedSeats.length / totalSeats;
  const availabilityRatio = availableSeats / totalSeats;

  const demandMultiplier = bookedPercentage > 0.7 ? 1.2 : bookedPercentage > 0.5 ? 1.1 : 1.0;
  const departureDate = new Date(busData.departureTime);
  const hours = departureDate.getHours();
  const isPeakTime = hours >= 17 && hours <= 22;
  const timeMultiplier = isPeakTime ? 1.15 : 1.0;
  const timeUntilTravel = (new Date(travelDate) - new Date()) / (1000 * 60 * 60);
  const urgencyMultiplier = timeUntilTravel < 24 ? 1.1 : 1.0;
  const availabilityMultiplier = availabilityRatio < 0.2 ? 1.25 : availabilityRatio < 0.4 ? 1.15 : 1.0;

  const windowSeats = getWindowSeats(totalSeats);
  const windowSeatCount = selectedSeats.filter(seat => windowSeats.includes(seat)).length;
  const windowSeatSurcharge = windowSeatCount * 100;

  const groupSize = selectedSeats.length;
  const isGroupBooking = groupSize >= 4;
  const groupDiscount = isGroupBooking ? 0.95 : 1.0;

  const dynamicFarePerSeat = Math.round(baseFare * demandMultiplier * timeMultiplier * urgencyMultiplier * availabilityMultiplier);
  const totalFare = (dynamicFarePerSeat * selectedSeats.length + windowSeatSurcharge) * groupDiscount;

  return {
    totalFare,
    baseFare: baseFare * selectedSeats.length,
    dynamicSurcharge: (dynamicFarePerSeat - baseFare) * selectedSeats.length,
    windowSeatSurcharge,
    groupDiscount: isGroupBooking ? 0.05 : 0,
    breakdown: {
      baseFarePerSeat: baseFare,
      dynamicFarePerSeat,
      windowSeatCount,
      demandMultiplier,
      timeMultiplier,
      urgencyMultiplier,
      availabilityMultiplier,
      groupDiscount,
    },
  };
};

const Detail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [totalFare, setTotalFare] = useState(0);
  const [bookingError, setBookingError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [availableWindowSeats, setAvailableWindowSeats] = useState(0);
  const [averageRating, setAverageRating] = useState(null);
  const [totalRatings, setTotalRatings] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [amenityRatings, setAmenityRatings] = useState({});
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [allowSocialTravel, setAllowSocialTravel] = useState(true);

  useEffect(() => {
    setIsLoggedIn(isUserLoggedIn());

    socket.on('seatUpdate', ({ busId, bookedSeats }) => {
      if (busId === id) {
        setBookedSeats(bookedSeats);
      }
    });

    return () => {
      socket.off('seatUpdate');
    };
  }, [id]);

  useEffect(() => {
    const fetchBusDetails = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bus/${id}`);
        const data = response.data.bus;

        if (!data || typeof data !== 'object') {
          throw new Error('Invalid bus data received');
        }

        data.departureTime = new Date(data.departureTime);
        data.destinationTime = new Date(data.destinationTime);
        data.arrivalTime = data.arrivalTime ? new Date(data.arrivalTime) : null;

        const requiredFields = ['date', 'totalSeats', 'source', 'destination', 'fare', 'departureTime', 'destinationTime', 'busType'];
        for (const field of requiredFields) {
          if (!(field in data) || data[field] === null || data[field] === undefined) {
            throw new Error(`Missing or invalid field: ${field}`);
          }
        }

        if (isNaN(data.departureTime.getTime()) || isNaN(data.destinationTime.getTime())) {
          throw new Error('Invalid departure or destination time');
        }

        const busDate = new Date(data.date);
        if (isNaN(busDate.getTime())) {
          throw new Error('Invalid date format');
        }

        setBus(data);
        setBookedSeats(data.bookedSeats || []);
      } catch (err) {
        console.error('Error fetching bus:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchAverageRating = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bus/${id}/average-rating`);
        const { averageRating, totalRatings } = response.data;
        setAverageRating(averageRating);
        setTotalRatings(totalRatings);
      } catch (err) {
        console.error('Error fetching average rating:', err.message);
        setAverageRating(null);
        setTotalRatings(0);
      }
    };

    const fetchAmenityRatings = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/amenities/ratings/${id}`);
        setAmenityRatings(response.data.ratings || {});
      } catch (err) {
        console.error('Error fetching amenity ratings:', err.message);
        setAmenityRatings({});
      }
    };

    fetchBusDetails();
    fetchAverageRating();
    fetchAmenityRatings();
  }, [id]);

  useEffect(() => {
    if (!bus) return;

    const tempSelections = sessionStorage.getItem('tempSelections');
    if (tempSelections) {
      try {
        const { selectedSeats: seats } = JSON.parse(tempSelections);
        if (seats?.length > 0) setSelectedSeats(seats);
        sessionStorage.removeItem('tempSelections');
      } catch (err) {
        console.error('Error parsing temp selections:', err);
      }
    } else if (location.state?.selections) {
      const { selectedSeats: seats } = location.state.selections;
      if (seats?.length > 0) setSelectedSeats(seats);
      navigate(location.pathname, { replace: true, state: {} });
    }

    // Initialize group booking state based on selected seats
    if (selectedSeats.length >= 2) {
      setIsGroupBooking(true);
      setGroupMembers(Array(selectedSeats.length - 1).fill({ email: '' }));
    } else {
      setIsGroupBooking(false);
      setGroupMembers([]);
    }
  }, [bus, location.state, navigate, location.pathname, selectedSeats]);

  useEffect(() => {
    if (!bus) return;
    const windowSeats = getWindowSeats(bus.totalSeats);
    const available = windowSeats.filter(seat => !bookedSeats.includes(seat)).length;
    setAvailableWindowSeats(available);

    const fareDetails = calculateDynamicFare(bus.fare, selectedSeats, bus, bus.date);
    setTotalFare(fareDetails.totalFare);

    if (selectedSeats.length >= 4) {
      setIsGroupBooking(true);
      setGroupMembers(Array(selectedSeats.length - 1).fill({ email: '' }));
    } else if (selectedSeats.length >= 2) {
      setIsGroupBooking(true);
      setGroupMembers(Array(selectedSeats.length - 1).fill({ email: '' }));
    } else {
      setIsGroupBooking(false);
      setGroupMembers([]);
    }
  }, [bus, bookedSeats, selectedSeats]);

  const handleGroupMemberChange = (index, value) => {
    const newGroupMembers = [...groupMembers];
    newGroupMembers[index] = { email: value };
    setGroupMembers(newGroupMembers);
  };

  const handleProceed = async () => {
    setBookingError(null);

    if (selectedSeats.length === 0) {
      setBookingError('Please select at least one seat');
      return;
    }

    if (!bus.date) {
      setBookingError('Travel date is not available');
      return;
    }

    if (new Date(bus.date) < new Date().setHours(0, 0, 0, 0)) {
      setBookingError('Travel date is in the past');
      return;
    }

    if (isGroupBooking && selectedSeats.length >= 2) {
      if (groupMembers.length !== selectedSeats.length - 1) {
        setBookingError('Number of group members must match the number of seats minus the lead booker');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const [index, member] of groupMembers.entries()) {
        if (!member.email || !emailRegex.test(member.email)) {
          setBookingError(`Invalid email for group member ${index + 1}`);
          return;
        }
      }
    }

    if (!isLoggedIn) {
      const bookingData = {
        busId: id,
        selectedSeats: selectedSeats.map(Number),
        travelDate: new Date(bus.date).toISOString(),
        totalFare,
        isGroupBooking,
        groupMembers: isGroupBooking ? groupMembers : [],
        allowSocialTravel,
        busDetails: {
          source: bus.source,
          destination: bus.destination,
          departureTime: bus.departureTime.toISOString(),
          destinationTime: bus.destinationTime.toISOString(),
          arrivalTime: bus.arrivalTime ? bus.arrivalTime.toISOString() : null,
          boardingPoints: bus.boardingPoints || [],
        },
      };

      sessionStorage.setItem('tempCheckoutData', JSON.stringify(bookingData));
      navigate('/login', {
        state: {
          from: `/bus/bus-details/${id}`,
          checkoutData: bookingData,
        },
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bus/${id}/reserve-seats`,
        { seats: selectedSeats.map(Number) },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      if (err.response?.status === 409) {
        setBookingError(
          `Some seats are already booked or reserved: ${err.response.data.conflictingSeats.join(', ')}. ` +
          `Available seats: ${err.response.data.availableSeats.join(', ')}`
        );
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bus/${id}`);
        const updatedBus = response.data.bus;
        updatedBus.departureTime = new Date(updatedBus.departureTime);
        updatedBus.destinationTime = new Date(updatedBus.destinationTime);
        updatedBus.arrivalTime = updatedBus.arrivalTime ? new Date(updatedBus.arrivalTime) : null;

        setBus(updatedBus);
        setBookedSeats(updatedBus.bookedSeats || []);
        setSelectedSeats([]);
        socket.emit('seatUpdate', { busId: id, bookedSeats: updatedBus.bookedSeats });
        return;
      }
      setBookingError('Failed to reserve seats. Please try again.');
      console.error('Seat reservation error:', err);
      return;
    }

    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bus/${id}`);
      const updatedBus = response.data.bus;
      updatedBus.departureTime = new Date(updatedBus.departureTime);
      updatedBus.destinationTime = new Date(updatedBus.destinationTime);
      updatedBus.arrivalTime = updatedBus.arrivalTime ? new Date(updatedBus.arrivalTime) : null;

      setBus(updatedBus);
      setBookedSeats(updatedBus.bookedSeats || []);
      socket.emit('seatUpdate', { busId: id, bookedSeats: updatedBus.bookedSeats });
    } catch (err) {
      setBookingError('Failed to refresh bus data. Please try again.');
      console.error('Bus refresh error:', err);
      return;
    }

    const bookingData = {
      busId: id,
      selectedSeats: selectedSeats.map(Number),
      travelDate: new Date(bus.date).toISOString(),
      totalFare,
      isGroupBooking,
      groupMembers: isGroupBooking ? groupMembers : [],
      allowSocialTravel,
      busDetails: {
        source: bus.source,
        destination: bus.destination,
        departureTime: bus.departureTime.toISOString(),
        destinationTime: bus.destinationTime.toISOString(),
        arrivalTime: bus.arrivalTime ? bus.arrivalTime.toISOString() : null,
        boardingPoints: bus.boardingPoints || [],
      },
    };

    sessionStorage.setItem('checkoutState', JSON.stringify(bookingData));
    sessionStorage.setItem('checkoutData', JSON.stringify(bookingData));
    navigate('/checkout', { state: bookingData });
  };

  const calculateDuration = (start, end) => {
    const diffMs = new Date(end) - new Date(start);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center text-neutral-600 dark:text-neutral-300"
    >
      <div className="animate-pulse bg-gray-200 h-48 w-full rounded-xl"></div>
    </motion.div>
  );

  if (error || !bus) return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center text-red-600"
    >
      Failed to load bus details: {error}
    </motion.div>
  );

  const busTypeStyles = {
  'AC': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  'Non-AC Seater': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
  'Sleeper': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
  'Volvo': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
  'Primo': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200', // New style for Primo
  'default': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-b from-violet-50 to-white dark:from-neutral-900 dark:to-neutral-800 pt-[8ch] pb-6 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-xl overflow-hidden shadow-lg mb-4"
        >
          <div className="relative w-full max-h-64 bg-gray-200">
            {!imageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gray-300 rounded-xl"></div>
            )}
            {bus.image ? (
              <motion.img
                src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/Uploads/${bus.image}`}
                alt={bus.busName}
                className="w-full max-h-64 object-contain transition-transform duration-300 hover:scale-105"
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            ) : (
              <div className="w-full max-h-64 bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-lg font-semibold">No Image Available</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">{bus.busName}</h1>
              <p className="text-sm text-white/90 drop-shadow-md">{bus.busNumber}</p>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: Bus Details and Seat Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-4"
          >
            {/* Bus Info Card */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-md p-4 hover:shadow-xl transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${busTypeStyles[bus.busType] || busTypeStyles.default}`}>
                    {bus.busType || 'AC'}
                  </span>
                  <h2 className="text-lg sm:text-xl font-semibold text-neutral-800 dark:text-neutral-100 mt-2">
                    {bus.source} to {bus.destination}
                  </h2>
                </div>
                <div className="text-left sm:text-right">
                  <div className="flex items-center gap-1 text-yellow-500">
                    {averageRating !== null ? (
                      <>
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} className={i < Math.round(averageRating) ? 'text-yellow-500' : 'text-gray-300'} />
                        ))}
                        <span className="ml-2 text-sm text-neutral-600 dark:text-neutral-300">
                          {averageRating.toFixed(1)} ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-neutral-500">No ratings yet</span>
                    )}
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-violet-600 dark:text-violet-400 mt-1">
                    ₹{totalFare}
                  </p>
                </div>
              </div>

              {/* Travel Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-neutral-600 dark:text-neutral-300">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FaMapMarkerAlt /> From
                  </p>
                  <p className="text-base">{bus.source}</p>
                  <p className="text-xs">
                    {bus.departureTime?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-base">
                    {bus.departureTime && bus.destinationTime &&
                      calculateDuration(bus.departureTime, bus.destinationTime)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium flex items-center gap-2 justify-end">
                    To <FaMapMarkerAlt />
                  </p>
                  <p className="text-base">{bus.destination}</p>
                  <p className="text-xs">
                    {bus.destinationTime?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Seat Selection */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-md p-4 hover:shadow-xl transition-shadow">
              <h3 className="text-base sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-3">Select Seats</h3>
              {bus.totalSeats === 54 ? (
                <SeatLayout54
                  totalSeats={54}
                  farePerSeat={bus.fare}
                  selectedSeats={selectedSeats}
                  setSelectedSeats={setSelectedSeats}
                  setTotalFare={setTotalFare}
                  bookedSeats={bookedSeats}
                  setBookingError={setBookingError}
                />
              ) : bus.totalSeats === 45 ? (
                <SeatLayout45
                  totalSeats={45}
                  farePerSeat={bus.fare}
                  selectedSeats={selectedSeats}
                  setSelectedSeats={setSelectedSeats}
                  setTotalFare={setTotalFare}
                  bookedSeats={bookedSeats}
                  setBookingError={setBookingError}
                />
              ) : (
                <p className="text-center text-neutral-600 dark:text-neutral-300">
                  Invalid seat configuration: {bus.totalSeats} seats not supported.
                </p>
              )}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <p>Selected: {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}</p>
                <p>Window Seats: {availableWindowSeats}</p>
                <p>Total Available: {bus.totalSeats - (bus.bookedSeats?.length || 0)}</p>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Booking Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-20 bg-white dark:bg-neutral-800 rounded-xl shadow-md p-4 hover:shadow-xl transition-shadow">
              <h3 className="text-base sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-3">Booking Summary</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
                    <FaCalendarAlt /> Travel Date
                  </p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                    {new Date(bus.date).toLocaleDateString('en-IN', {
                      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
                {bus.boardingPoints && bus.boardingPoints.length > 0 && (
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
                      <FaMapMarkerAlt /> Boarding Points
                    </p>
                    <p className="text-sm text-neutral-800 dark:text-neutral-100">{bus.boardingPoints.join(', ')}</p>
                  </div>
                )}
                {bus.haltingTime && (
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
                      <FaClock /> Halting Time
                    </p>
                    <p className="text-sm text-neutral-800 dark:text-neutral-100">{bus.haltingTime}</p>
                  </div>
                )}
                {Object.keys(amenityRatings).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">Amenity Ratings</h3>
                    {Object.entries(amenityRatings).map(([amenity, { average, count }]) => (
                      <div key={amenity} className="flex items-center space-x-2">
                        <span className="capitalize text-neutral-600 dark:text-neutral-400">{amenity}:</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              className={`text-sm ${i < Math.round(average) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          {average}/5 ({count} reviews)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">Selected Seats</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                    {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
                  </p>
                </div>
                {selectedSeats.length >= 2 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {selectedSeats.length >= 4 ? 'Group Booking (Required for 4+ seats)' : 'Group Booking'}
                    </p>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Group Members</h4>
                      {groupMembers.map((member, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="email"
                            value={member.email}
                            onChange={(e) => handleGroupMemberChange(index, e.target.value)}
                            placeholder={`Member ${index + 1} Email`}
                            className="w-full bg-gray-100 dark:bg-gray-800 px-3 h-10 rounded-md text-sm text-gray-800 dark:text-gray-100"
                            required={selectedSeats.length >= 4}
                          />
                        </div>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={allowSocialTravel}
                        onChange={(e) => setAllowSocialTravel(e.target.checked)}
                        className="h-4 w-4 text-violet-600"
                      />
                      Allow Social Travel (Connect with other passengers)
                    </label>
                  </div>
                )}
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">Total Fare</p>
                  <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                    ₹{totalFare}
                  </p>
                  {selectedSeats.length >= 4 && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      5% Group Discount Applied
                    </p>
                  )}
                </div>
                <AnimatePresence>
                  {bookingError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-100 text-red-700 p-2 rounded-md text-sm"
                    >
                      {bookingError}
                      <button
                        onClick={() => setBookingError(null)}
                        className="ml-2 text-red-900 hover:underline"
                      >
                        Dismiss
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleProceed}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-2 rounded-lg hover:from-violet-700 hover:to-purple-700 transition-colors"
                >
                  Proceed to Checkout
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Description */}
        {bus.description && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 bg-white dark:bg-neutral-800 rounded-xl shadow-md p-4 hover:shadow-xl transition-shadow"
          >
            <h3 className="text-base sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-2">About This Bus</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{bus.description}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Detail;