import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaArrowRightLong } from 'react-icons/fa6';

// Validate MongoDB ObjectID (24-character hexadecimal)
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

const getWindowSeats = (totalSeats) => {
  if (totalSeats === 54) {
    return [
      ...Array.from({ length: 11 }, (_, i) => i + 1),
      ...Array.from({ length: 10 }, (_, i) => i + 45),
    ];
  } else if (totalSeats === 45) {
    return [1, 11, 12, 22, 23, 24, 34, 35, 45];
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

const Checkout = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busData, setBusData] = useState(null);
  const [dynamicFare, setDynamicFare] = useState(null);
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [allowSocialTravel, setAllowSocialTravel] = useState(true);

  const [formData, setFormData] = useState({
    contactDetails: {
      phone: '',
      altPhone: '',
      state: '',
    },
    passengers: [],
    boardingPoint: '',
  });

  useEffect(() => {
    const checkStateAndFetchData = async () => {
      try {
        const savedState = sessionStorage.getItem('checkoutState');
        const currentState = state || (savedState && JSON.parse(savedState));

        console.log('Checkout state:', currentState); // Debug log
        console.log('Checkout sessionStorage:', savedState); // Debug log

        if (!currentState || !currentState.busDetails || !currentState.selectedSeats || !currentState.travelDate) {
          alert('Invalid booking data. Please select a bus again.');
          sessionStorage.removeItem('checkoutState');
          navigate('/');
          return;
        }

        const busId = currentState.busDetails._id || currentState.busId;
        if (!busId || !isValidObjectId(busId)) {
          console.error('Invalid busId:', busId);
          alert('Invalid bus ID format. Please select a bus again.');
          sessionStorage.removeItem('checkoutState');
          navigate('/');
          return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
          sessionStorage.setItem('checkoutState', JSON.stringify(currentState));
          navigate('/login', { state: currentState });
          return;
        }

        const userResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        let bus;
        try {
          const busResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bus/${busId}`);
          bus = busResponse.data.bus;
        } catch (busError) {
          if (busError.response?.status === 404) {
            console.error('Bus not found for busId:', busId);
            alert('Bus not found. It may have been removed or is unavailable. Please select another bus.');
            sessionStorage.removeItem('checkoutState');
            navigate('/');
            return;
          }
          throw busError;
        }

        if (!bus || !bus.fare || bus.fare <= 0) {
          console.error('Invalid bus data:', bus);
          alert('Invalid bus fare data. Please select another bus.');
          navigate('/');
          return;
        }

        setFormData({
          contactDetails: {
            phone: userResponse.data.phone || '',
            altPhone: userResponse.data.altPhone || '',
            state: userResponse.data.state || '',
          },
          passengers: currentState.selectedSeats.map(() => ({
            name: '',
            gender: 'male',
            age: 18,
          })),
          boardingPoint: currentState.boardingPoint || bus.boardingPoints?.[0] || '',
        });

        setIsGroupBooking(currentState.isGroupBooking || currentState.selectedSeats.length >= 4);
        setGroupMembers(currentState.groupMembers || (currentState.selectedSeats.length >= 2 ? Array(currentState.selectedSeats.length - 1).fill({ email: '' }) : []));
        setAllowSocialTravel(currentState.allowSocialTravel !== undefined ? currentState.allowSocialTravel : true);

        setUserDetails(userResponse.data);
        setBookingData(currentState);
        setBusData(bus);
        sessionStorage.removeItem('checkoutState');
      } catch (error) {
        console.error('Error fetching data:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        alert(`Failed to load booking data: ${error.message || 'Unknown error'}`);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkStateAndFetchData();
  }, [navigate, state]);

  useEffect(() => {
    if (bookingData && busData && bookingData.selectedSeats && bookingData.travelDate) {
      const baseFare = busData.fare || 500;
      const fareDetails = calculateDynamicFare(baseFare, bookingData.selectedSeats, busData, bookingData.travelDate);
      setDynamicFare(fareDetails);
    }
  }, [bookingData, busData]);

  const handlePassengerChange = (index, field, value) => {
    const newPassengers = [...formData.passengers];
    newPassengers[index][field] = value;
    setFormData({ ...formData, passengers: newPassengers });
  };

  const handleGroupMemberChange = (index, value) => {
    const newGroupMembers = [...groupMembers];
    newGroupMembers[index] = { email: value };
    setGroupMembers(newGroupMembers);
  };

  const handleBoardingPointChange = (e) => {
    setFormData({ ...formData, boardingPoint: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!bookingData || !userDetails || !busData || !dynamicFare || !formData.passengers.length) {
      alert('Incomplete booking data. Please try again.');
      setIsSubmitting(false);
      return;
    }

    if (busData.boardingPoints?.length > 0 && !formData.boardingPoint) {
      alert('Please select a boarding point.');
      setIsSubmitting(false);
      return;
    }

    const busId = bookingData.busDetails?._id || bookingData.busId;
    const sanitizedEmail = userDetails?.email?.trim()?.replace(/['"]/g, '') || '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
      alert('Invalid email address. Please update your profile.');
      navigate('/update-profile');
      setIsSubmitting(false);
      return;
    }

    if (!formData.contactDetails.phone) {
      alert('Phone number is required.');
      setIsSubmitting(false);
      return;
    }

    for (const [index, passenger] of formData.passengers.entries()) {
      if (!passenger.name || !passenger.gender || !passenger.age) {
        alert(`Passenger ${index + 1} is missing required fields (name, gender, or age).`);
        setIsSubmitting(false);
        return;
      }
      if (!['male', 'female', 'other'].includes(passenger.gender)) {
        alert(`Passenger ${index + 1} has invalid gender. Must be 'male', 'female', or 'other'.`);
        setIsSubmitting(false);
        return;
      }
      if (isNaN(passenger.age) || passenger.age < 1 || passenger.age > 100) {
        alert(`Passenger ${index + 1} has invalid age. Must be between 1 and 100.`);
        setIsSubmitting(false);
        return;
      }
    }

    if (isGroupBooking && groupMembers.length > 0) {
      for (const [index, member] of groupMembers.entries()) {
        if (!member.email || !emailRegex.test(member.email)) {
          alert(`Invalid email for group member ${index + 1}.`);
          setIsSubmitting(false);
          return;
        }
      }
    }

    const payload = {
      busId,
      selectedSeats: bookingData.selectedSeats,
      travelDate: bookingData.travelDate,
      totalFare: dynamicFare.totalFare,
      contactDetails: {
        email: sanitizedEmail,
        phone: formData.contactDetails.phone,
        altPhone: formData.contactDetails.altPhone || '',
        state: formData.contactDetails.state || '',
      },
      passengers: formData.passengers,
      boardingPoint: formData.boardingPoint || null,
      isGroupBooking,
      groupMembers: isGroupBooking ? groupMembers : [],
      allowSocialTravel,
      groupSize: bookingData.selectedSeats.length,
      groupLeadUserId: userDetails._id,
      fareDetails: {
        baseFare: dynamicFare.baseFare,
        dynamicSurcharge: dynamicFare.dynamicSurcharge,
        windowSeatSurcharge: dynamicFare.windowSeatSurcharge,
        groupDiscount: dynamicFare.groupDiscount,
      },
    };

    // Additional validation
    if (!isValidObjectId(busId)) {
      alert('Invalid bus ID.');
      setIsSubmitting(false);
      return;
    }
    if (!payload.travelDate || isNaN(new Date(payload.travelDate).getTime())) {
      alert('Invalid travel date.');
      setIsSubmitting(false);
      return;
    }
    if (!Number.isFinite(payload.totalFare) || payload.totalFare <= 0) {
      alert('Invalid total fare.');
      setIsSubmitting(false);
      return;
    }

    console.log('Submitting booking payload:', JSON.stringify(payload, null, 2));

    const token = localStorage.getItem('token');
    try {
      const busResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bus/${busId}`);
      const bus = busResponse.data.bus;
      const confirmedBookedSeats = bus.bookedSeats || [];
      const pendingSeats = bus.pendingBookings
        ? bus.pendingBookings
            .filter(pb => pb.userId?.toString() !== userDetails._id && new Date(pb.expiresAt) > new Date())
            .flatMap(pb => pb.seats)
        : [];
      const otherTakenSeats = [...new Set([...confirmedBookedSeats, ...pendingSeats])];
      const conflictingSeats = payload.selectedSeats.filter(seat => otherTakenSeats.includes(seat));

      if (conflictingSeats.length > 0) {
        alert(
          `Seats no longer available: ${conflictingSeats.join(', ')}. Please choose different seats.`
        );
        navigate(`/bus/bus-details/${busId}`);
        setIsSubmitting(false);
        return;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bookings`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      navigate(`/booking-summary/${response.data.bookingId}`);
    } catch (err) {
      let errorMessage = 'An error occurred while processing your booking. Please try again.';
      if (err.response?.status === 404) {
        errorMessage = 'Bus not found. Please select another bus.';
        navigate('/');
      } else if (err.response?.status === 409) {
        const conflictingSeats = err.response.data.conflictingSeats || [];
        const availableSeats = err.response.data.availableSeats || [];
        if (err.response.data.error.includes('No valid reservation found')) {
          errorMessage = 'Your seat reservation has expired or is invalid. Please select seats again.';
        } else {
          errorMessage = `Some seats are no longer available: ${conflictingSeats.join(', ')}. Available seats: ${availableSeats.join(', ')}. Please choose different seats.`;
        }
        navigate(`/bus/bus-details/${busId}`);
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data.error || 'Invalid booking details provided.';
      } else if (err.response?.status === 500) {
        errorMessage = err.response.data.details || 'Server error. Please try again later.';
      }
      alert(errorMessage);
      console.error('Checkout error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        payload: JSON.stringify(payload, null, 2),
      });
      setIsSubmitting(false);
    }
  };

  const formatTime = (time) => {
    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return `${hours}:${minutes} ${month} ${day}`;
  };

  const calculateDuration = (departureTime, destinationTime) => {
    const departure = new Date(departureTime);
    const destination = new Date(destinationTime);
    const diffMs = destination - departure;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) return <div className="text-center py-4">Loading checkout details...</div>;
  if (!bookingData || !dynamicFare || !busData) return null;

  const { selectedSeats, busDetails } = bookingData;
  const source = busDetails?.source || busData?.source || 'N/A';
  const destination = busDetails?.destination || busData?.destination || 'N/A';
  const departureTime = busDetails?.departureTime || busData?.departureTime;
  const destinationTime = busDetails?.destinationTime || busData?.destinationTime;
  const boardingPoints = busData?.boardingPoints || [];
  const formattedDeparture = departureTime ? formatTime(departureTime) : 'N/A';
  const formattedDestination = destinationTime ? formatTime(destinationTime) : 'N/A';
  const duration = departureTime && destinationTime ? calculateDuration(departureTime, destinationTime) : 'N/A';

  return (
    <div className="w-full lg:px-24 md:px-12 sm:px-6 px-4 pt-[8ch] mb-8 space-y-4">
      <div className="grid grid-cols-5 gap-4 items-start">
        <div className="col-span-3 space-y-6 pr-6">
          <div className="space-y-4">
            <h2 className="text-lg text-gray-800 dark:text-white font-medium">
              Contact Details
            </h2>
            <div>
              <label className="block mb-1 font-medium text-sm">Email Address</label>
              <input
                type="email"
                value={userDetails?.email || ''}
                readOnly
                className="w-full bg-gray-100 dark:bg-gray-800 px-3 h-12 rounded-md cursor-not-allowed"
              />
            </div>
            {userDetails?.email && (
              <p className="text-sm text-green-500 dark:text-green-400">
                Booking confirmation will be sent to <strong>{userDetails.email}</strong>.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1 font-medium text-sm">Phone Number</label>
                <input
                  type="tel"
                  value={formData.contactDetails.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactDetails: { ...formData.contactDetails, phone: e.target.value },
                    })
                  }
                  className="w-full bg-gray-100 dark:bg-gray-800 px-3 h-12 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Alternate Phone</label>
                <input
                  type="tel"
                  value={formData.contactDetails.altPhone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactDetails: { ...formData.contactDetails, altPhone: e.target.value },
                    })
                  }
                  className="w-full bg-gray-100 dark:bg-gray-800 px-3 h-12 rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-medium">State of Residence</label>
              <select
                value={formData.contactDetails.state}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactDetails: { ...formData.contactDetails, state: e.target.value },
                  })
                }
                className="w-full bg-gray-100 dark:bg-gray-800 px-3 h-12 rounded-md"
                required
              >
                <option value="">Select State</option>
                <option value="AP">Andhra Pradesh</option>
                <option value="AR">Arunachal Pradesh</option>
                <option value="AS">Assam</option>
                <option value="BR">Bihar</option>
                <option value="CG">Chhattisgarh</option>
                <option value="GA">Goa</option>
                <option value="GJ">Gujarat</option>
                <option value="HR">Haryana</option>
                <option value="HP">Himachal Pradesh</option>
                <option value="JH">Jharkhand</option>
                <option value="KA">Karnataka</option>
                <option value="KL">Kerala</option>
                <option value="MP">Madhya Pradesh</option>
                <option value="MH">Maharashtra</option>
                <option value="MN">Manipur</option>
                <option value="ML">Meghalaya</option>
                <option value="MZ">Mizoram</option>
                <option value="NL">Nagaland</option>
                <option value="OD">Odisha</option>
                <option value="PB">Punjab</option>
                <option value="RJ">Rajasthan</option>
                <option value="SK">Sikkim</option>
                <option value="TN">Tamil Nadu</option>
                <option value="TS">Telangana</option>
                <option value="TR">Tripura</option>
                <option value="UP">Uttar Pradesh</option>
                <option value="UK">Uttarakhand</option>
                <option value="WB">West Bengal</option>
                <option value="AN">Andaman and Nicobar Islands</option>
                <option value="CH">Chandigarh</option>
                <option value="DN">Dadra and Nagar Haveli and Daman and Diu</option>
                <option value="DL">Delhi</option>
                <option value="JK">Jammu and Kashmir</option>
                <option value="LA">Ladakh</option>
                <option value="LD">Lakshadweep</option>
                <option value="PY">Puducherry</option>
              </select>
            </div>
            {selectedSeats.length >= 2 && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={isGroupBooking}
                    onChange={(e) => {
                      setIsGroupBooking(e.target.checked);
                      setGroupMembers(e.target.checked ? Array(selectedSeats.length - 1).fill({ email: '' }) : []);
                    }}
                    className="h-4 w-4 text-violet-600"
                  />
                  Book as a Group
                </label>
                {isGroupBooking && (
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
                          required
                        />
                      </div>
                    ))}
                  </div>
                )}
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
            {boardingPoints.length > 0 && (
              <div>
                <label className="block mb-1 font-medium text-sm">Boarding Point</label>
                <select
                  value={formData.boardingPoint}
                  onChange={handleBoardingPointChange}
                  className="w-full bg-gray-100 dark:bg-gray-800 px-3 h-12 rounded-md"
                  required
                >
                  <option value="">Select Boarding Point</option>
                  {boardingPoints.map((point, index) => (
                    <option key={index} value={point}>{point}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg text-gray-800 dark:text-white font-medium">
              Passenger Information
            </h2>
            {formData.passengers.map((passenger, index) => (
              <div key={index} className="space-y-3 border p-4 rounded-md">
                <h3 className="text-gray-600 dark:text-gray-300">Passenger {index + 1} (Seat {selectedSeats[index]})</h3>
                <div>
                  <label className="block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={passenger.name}
                    onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-800 px-3 h-12 rounded-md"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block mb-1">Gender</label>
                    <select
                      value={passenger.gender}
                      onChange={(e) => handlePassengerChange(index, 'gender', e.target.value)}
                      className="w-full bg-gray-100 dark:bg-gray-800 px-3 h-12 rounded-md"
                      required
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1">Age</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={passenger.age}
                      onChange={(e) => handlePassengerChange(index, 'age', e.target.value)}
                      className="w-full bg-gray-100 dark:bg-gray-800 px-3 h-12 rounded-md"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full px-6 py-3 rounded-lg text-base font-semibold text-white transition-colors 
                ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'}`}
            >
              {isSubmitting ? 'Processing...' : 'Book Now'} <FaArrowRightLong className="inline ml-2" />
            </button>
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Booking Summary</h2>
          <div className="border p-4 rounded-md shadow-sm bg-white dark:bg-gray-800">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{formattedDeparture}</p>
                <p className="text-base font-semibold">{source}</p>
              </div>
            </div>
            <div className="flex items-center my-2">
              <div className="flex-1 border-t border-gray-300 dark:border-gray-600 relative">
                <span className="absolute top-[-0.75rem] left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-2 text-sm text-gray-500 dark:text-gray-400">
                  {duration}
                </span>
              </div>
              <FaArrowRightLong className="mx-2 text-gray-500 dark:text-gray-400" />
              <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{formattedDestination}</p>
                <p className="text-base font-semibold">{destination}</p>
              </div>
            </div>
            <div className="mt-4 space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><strong>Selected Seats:</strong> {selectedSeats.join(', ')}</p>
              {isGroupBooking && (
                <p><strong>Group Booking:</strong> Yes (Lead: {userDetails?.email})</p>
              )}
              {groupMembers.length > 0 && (
                <p><strong>Group Members:</strong> {groupMembers.map(m => m.email).join(', ')}</p>
              )}
              {formData.boardingPoint && (
                <p><strong>Boarding Point:</strong> {formData.boardingPoint}</p>
              )}
              <div className="space-y-1">
                <p><strong>Base Fare:</strong> ₹{dynamicFare.baseFare}</p>
                {dynamicFare.dynamicSurcharge > 0 && (
                  <p><strong>Dynamic Pricing Surcharge:</strong> ₹{dynamicFare.dynamicSurcharge}</p>
                )}
                {dynamicFare.windowSeatSurcharge > 0 && (
                  <p><strong>Window Seat Premium ({dynamicFare.breakdown.windowSeatCount} seats):</strong> ₹{dynamicFare.windowSeatSurcharge}</p>
                )}
                {dynamicFare.groupDiscount > 0 && (
                  <p><strong>Group Discount (5%):</strong> -₹{Math.round(dynamicFare.totalFare / (1 - dynamicFare.groupDiscount) * dynamicFare.groupDiscount)}</p>
                )}
                <p className="font-semibold"><strong>Total Fare:</strong> ₹{dynamicFare.totalFare}</p>
              </div>
              <p><strong>Travel Date:</strong> {new Date(bookingData.travelDate).toLocaleDateString()}</p>
              {busData?.isTrackingEnabled && (
                <p className="mt-2">
                  <strong>Track Bus:</strong>{' '}
                  <span className="text-blue-600 dark:text-blue-400">Available after booking</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
