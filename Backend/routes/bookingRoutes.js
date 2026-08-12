const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');
const Booking = require('../models/Booking');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const restrictTo = require('../middleware/restrictTo');
const {
  sendBookingEmail,
  sendCancellationEmail,
  sendGroupInvitationEmail,
  sendDelayNoticeEmail
} = require('../utils/email');
const Message = require('../models/Message');
const GroupMessage = require('../models/GroupMessage'); // New import
const { subHours, startOfHour, subDays, startOfDay } = require('date-fns');

//Test-email at production
router.get('/__email-test', authenticate, restrictTo('admin'), async (req, res) => {
  sendBookingEmail({
    _id: 'TEST123',
    seatsBooked: [1],
    totalFare: 500,
    contactDetails: { email: process.env.EMAIL_USER },
  }, {
    source: 'A',
    destination: 'B',
  });

  res.json({ success: true });
});

// Debug email configuration in production
router.get('/__debug-email', authenticate, restrictTo('admin'), (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    resendApiKeyExists: !!process.env.RESEND_API_KEY,
    resendApiKeyLength: process.env.RESEND_API_KEY?.length,
    emailFrom: process.env.EMAIL_FROM,
    nodeVersion: process.version,
    smtpConfigured: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS),
  });
});



// Email utility functions imported from utils/email.js

// Get window seats for dynamic fare calculation
const getWindowSeats = (totalSeats) => {
  if (totalSeats === 54) {
    return [...Array.from({ length: 11 }, (_, i) => i + 1), ...Array.from({ length: 10 }, (_, i) => i + 45)];
  } else if (totalSeats === 45) {
    return [1, 11, 12, 22, 23, 24, 34, 35, 45];
  }
  return [];
};

// // Calculate dynamic fare
// const calculateDynamicFare = (baseFare, selectedSeats, bus, travelDate) => {
//   if (!bus || !bus.totalSeats) return { totalFare: baseFare * selectedSeats.length, breakdown: {} };

//   const { totalSeats, bookedSeats = [], departureTime } = bus;
//   const availableSeats = totalSeats - bookedSeats.length;
//   const bookedPercentage = bookedSeats.length / totalSeats;
//   const availabilityRatio = availableSeats / totalSeats;

//   const demandMultiplier = bookedPercentage > 0.7 ? 1.2 : bookedPercentage > 0.5 ? 1.1 : 1.0;
//   const departureDate = new Date(departureTime);
//   const hours = departureDate.getHours();
//   const isPeakTime = hours >= 17 && hours <= 22;
//   const timeMultiplier = isPeakTime ? 1.15 : 1.0;
//   const timeUntilTravel = (new Date(travelDate) - new Date()) / (1000 * 60 * 60);
//   const urgencyMultiplier = timeUntilTravel < 24 ? 1.1 : 1.0;
//   const availabilityMultiplier = availabilityRatio < 0.2 ? 1.25 : availabilityRatio < 0.4 ? 1.15 : 1.0;

//   const windowSeats = getWindowSeats(totalSeats);
//   const windowSeatCount = selectedSeats.filter(seat => windowSeats.includes(seat)).length;
//   const windowSeatSurcharge = windowSeatCount * 100;

//   const groupSize = selectedSeats.length;
//   const isGroupBooking = groupSize >= 4; // Define group booking threshold
//   const groupDiscount = isGroupBooking ? 0.95 : 1.0; // 5% discount for groups

//   const dynamicFarePerSeat = Math.round(
//     baseFare * demandMultiplier * timeMultiplier * urgencyMultiplier * availabilityMultiplier
//   );
//   const totalFare = (dynamicFarePerSeat * selectedSeats.length + windowSeatSurcharge) * groupDiscount;

//   return {
//     totalFare,
//     baseFare: baseFare * selectedSeats.length,
//     dynamicSurcharge: (dynamicFarePerSeat - baseFare) * selectedSeats.length,
//     windowSeatSurcharge,
//     groupDiscount: isGroupBooking ? 0.05 : 0, // Track discount applied
//     breakdown: {
//       baseFarePerSeat: baseFare,
//       dynamicFarePerSeat,
//       windowSeatCount,
//       demandMultiplier,
//       timeMultiplier,
//       urgencyMultiplier,
//       availabilityMultiplier,
//       groupDiscount,
//     },
//   };
// };

// Calculate dynamic fare
const calculateDynamicFare = (baseFare, selectedSeats, bus) => {
  if (!bus || !bus.totalSeats) {
    return {
      totalFare: baseFare * selectedSeats.length,
      breakdown: {},
    };
  }

  const { totalSeats, bookedSeats = [], departureTime } = bus;

  const availableSeats = totalSeats - bookedSeats.length;
  const bookedPercentage = bookedSeats.length / totalSeats;
  const availabilityRatio = availableSeats / totalSeats;

  // Demand multiplier
  const demandMultiplier =
    bookedPercentage > 0.7
      ? 1.2
      : bookedPercentage > 0.5
      ? 1.1
      : 1.0;

  // Use departure time (not travelDate) for all time calculations
  const departure = new Date(departureTime);

  // Get departure hour in IST
  const departureIST = new Date(
    departure.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    })
  );

  const hours = departureIST.getHours();

  // Peak hours: 5 PM - 10 PM IST
  const isPeakTime = hours >= 17 && hours <= 22;
  const timeMultiplier = isPeakTime ? 1.15 : 1.0;

  // Hours remaining until departure
  const now = new Date();
  const timeUntilTravel =
    (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

  const urgencyMultiplier = timeUntilTravel < 24 ? 1.1 : 1.0;

  // Availability multiplier
  const availabilityMultiplier =
    availabilityRatio < 0.2
      ? 1.25
      : availabilityRatio < 0.4
      ? 1.15
      : 1.0;

  // Window seat surcharge
  const windowSeats = getWindowSeats(totalSeats);

  const windowSeatCount = selectedSeats.filter((seat) =>
    windowSeats.includes(seat)
  ).length;

  const windowSeatSurcharge = windowSeatCount * 100;

  // Group booking discount
  const groupSize = selectedSeats.length;
  const isGroupBooking = groupSize >= 4;
  const groupDiscount = isGroupBooking ? 0.95 : 1.0;

  // Final fare
  const dynamicFarePerSeat = Math.round(
    baseFare *
      demandMultiplier *
      timeMultiplier *
      urgencyMultiplier *
      availabilityMultiplier
  );

  const totalFare = Math.round(
    (dynamicFarePerSeat * selectedSeats.length +
      windowSeatSurcharge) *
      groupDiscount
  );

  return {
    totalFare,
    baseFare: baseFare * selectedSeats.length,
    dynamicSurcharge:
      (dynamicFarePerSeat - baseFare) * selectedSeats.length,
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
      departureHourIST: hours,
      timeUntilTravel,
    },
  };
};

// Create a new booking
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      busId,
      selectedSeats,
      travelDate,
      totalFare,
      contactDetails,
      passengers,
      boardingPoint,
      isGroupBooking,
      groupMembers,
      allowSocialTravel,
    } = req.body;
    const userId = req.user.id;

    const requiredFields = ['busId', 'selectedSeats', 'travelDate', 'totalFare', 'contactDetails', 'passengers'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    if (!contactDetails.email || !contactDetails.phone || !contactDetails.state) {
      return res.status(400).json({
        error: 'Contact details must include email, phone number, and state',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactDetails.email)) {
      return res.status(400).json({
        error: 'Invalid email address provided',
      });
    }

    if (isGroupBooking) {
      if (!groupMembers || !Array.isArray(groupMembers) || groupMembers.length !== selectedSeats.length - 1) {
        return res.status(400).json({
          error: 'Group members must match the number of seats minus the lead booker',
        });
      }
      for (const member of groupMembers) {
        if (!member.email && !member.userId) {
          return res.status(400).json({ error: 'Each group member must have an email or userId' });
        }
        if (member.email && !emailRegex.test(member.email)) {
          return res.status(400).json({ error: `Invalid email for group member: ${member.email}` });
        }
      }
    }

    if (!Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).json({
        error: 'At least one passenger is required',
      });
    }

    for (const [index, passenger] of passengers.entries()) {
      if (!passenger.name || !passenger.gender || !passenger.age) {
        return res.status(400).json({
          error: `Passenger ${index + 1} is missing required fields (name, gender, or age)`,
        });
      }
      if (!['male', 'female', 'other'].includes(passenger.gender)) {
        return res.status(400).json({
          error: `Passenger ${index + 1} has invalid gender. Must be 'male', 'female', or 'other'`,
        });
      }
    }

    const bus = await Bus.findById(busId).populate('driverId', 'name');
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    const busDate = new Date(bus.date).toISOString().split('T')[0];
    const inputTravelDate = new Date(travelDate).toISOString().split('T')[0];
    if (busDate !== inputTravelDate) {
      return res.status(400).json({
        error: `Travel date (${inputTravelDate}) does not match the bus schedule date (${busDate})`,
      });
    }

    const now = new Date();
    const travelDateObj = new Date(travelDate);
    const departureDateTime = new Date(bus.departureTime);

    if (
      travelDateObj.toDateString() === now.toDateString() &&
      now >= departureDateTime
    ) {
      return res.status(400).json({
        error: 'This bus has already departed',
      });
    }

    if (boardingPoint && bus.boardingPoints.length > 0 && !bus.boardingPoints.includes(boardingPoint)) {
      return res.status(400).json({
        error: `Invalid boarding point selected. Available options: ${bus.boardingPoints.join(', ')}`,
      });
    }

    const fareDetails = calculateDynamicFare(bus.fare, selectedSeats, bus);
    if (Math.abs(totalFare - fareDetails.totalFare) > 1) {
      return res.status(400).json({
        error: 'Invalid total fare provided',
        expectedFare: fareDetails.totalFare,
        providedFare: totalFare,
      });
    }

    const bookings = await Booking.find({
      busId: bus._id,
      travelDate: {
        $gte: new Date(busDate),
        $lt: new Date(new Date(busDate).getTime() + 24 * 60 * 60 * 1000),
      },
      status: 'confirmed',
    });

    const bookedSeats = [...new Set(bookings.flatMap(booking => booking.seatsBooked))];
    const pendingSeats = [...new Set(
      bus.pendingBookings
        .filter(pb => {
          const isOtherUser = pb.userId.toString() !== userId;
          const isNotExpired = pb.expiresAt > now;
          return isOtherUser && isNotExpired;
        })
        .flatMap(pb => pb.seats)
    )];

    const allTakenSeats = [...new Set([...bookedSeats, ...pendingSeats])];
    const conflictingSeats = selectedSeats.filter(seat => allTakenSeats.includes(seat));

    if (conflictingSeats.length > 0) {
      return res.status(409).json({
        error: 'Some seats are already booked or reserved',
        conflictingSeats,
        availableSeats: Array.from({ length: bus.totalSeats }, (_, i) => i + 1).filter(
          seat => !allTakenSeats.includes(seat)
        ),
      });
    }

    const userPendingBooking = bus.pendingBookings.find(pb =>
      pb.userId.toString() === userId &&
      pb.expiresAt > now &&
      selectedSeats.every(seat => pb.seats.includes(seat))
    );

    if (!userPendingBooking) {
      return res.status(409).json({
        error: 'No valid reservation found for these seats. Please go back and select seats again.',
        availableSeats: Array.from({ length: bus.totalSeats }, (_, i) => i + 1).filter(
          seat => !allTakenSeats.includes(seat)
        ),
      });
    }

    const booking = new Booking({
      busId,
      userId,
      seatsBooked: selectedSeats,
      totalFare: fareDetails.totalFare,
      travelDate: new Date(travelDate),
      departureTime: bus.departureTime,
      destinationTime: bus.destinationTime,
      status: 'confirmed',
      contactDetails: {
        email: contactDetails.email.trim().replace(/['"]/g, ''),
        phone: contactDetails.phone,
        altPhone: contactDetails.altPhone || '',
        state: contactDetails.state,
      },
      passengers: passengers.map(p => ({
        name: p.name,
        gender: p.gender,
        age: p.age,
      })),
      fareBreakdown: fareDetails.breakdown,
      boardingPoint: boardingPoint || null,
      isChatEnabled: true,
      bookingDate: new Date(),
      isGroupBooking: !!isGroupBooking,
      groupSize: selectedSeats.length,
      groupLeadUserId: userId,
      groupMembers: isGroupBooking
        ? groupMembers.map(member => ({
          userId: member.userId || null,
          email: member.email || null,
          isConfirmed: member.userId && member.userId === userId,
        }))
        : [],
      allowSocialTravel: allowSocialTravel !== undefined ? allowSocialTravel : true,
    });

    await booking.save();

    // Set trackingLink after saving (now booking._id is available)
    if (bus.isTrackingEnabled) {
      booking.trackingLink = `${process.env.FRONTEND_URL}/track-bus/${busId}/${booking._id}`;
      await booking.save();
    }

    await Bus.findByIdAndUpdate(busId, {
      $pull: { pendingBookings: { userId } },
    });

    await Bus.findByIdAndUpdate(
      busId,
      { $addToSet: { bookedSeats: { $each: selectedSeats } } },
      { new: true }
    );

    sendBookingEmail(booking, bus)
  .catch(err => console.error('Email failed:', err.message));



    if (isGroupBooking) {
      for (const member of groupMembers) {
        if (member.email && member.email !== contactDetails.email) {
          sendGroupInvitationEmail(member.email, booking, bus)
            .catch(err => console.error('Group invitation email failed:', err.message));
        }
      }
    }


    const io = req.app.get('io');
    if (io) {
      io.to(booking._id.toString()).emit('bookingStatusUpdate', {
        bookingId: booking._id,
        status: booking.status,
        isChatEnabled: booking.isChatEnabled,
      });
      io.to(bus.groupChatRoomId).emit('newPassenger', {
        bookingId: booking._id,
        userId,
        allowSocialTravel,
      });
      io.emit('busAlert', {
        busId,
        message: `New ${isGroupBooking ? 'group' : 'individual'} booking for ${bus.busName} (${selectedSeats.length} seats)`,
        severity: 'low',
      });
    }

    res.status(201).json({
      message: 'Booking created successfully',
      bookingId: booking._id,
      seatsBooked: booking.seatsBooked,
      totalFare: booking.totalFare,
      fareBreakdown: booking.fareBreakdown,
      boardingPoint: booking.boardingPoint,
      trackingLink: booking.trackingLink,
      isChatEnabled: booking.isChatEnabled,
      isGroupBooking: booking.isGroupBooking,
      groupMembers: booking.groupMembers,
      allowSocialTravel: booking.allowSocialTravel,
    });
  } catch (err) {
    console.error('Booking creation error:', {
      message: err.message,
      stack: err.stack,
      payload: req.body,
      userId: req.user?.id,
    });
    // Only attempt to clean up pendingBookings if busId is defined
    if (req.body.busId && mongoose.isValidObjectId(req.body.busId)) {
      await Bus.findByIdAndUpdate(req.body.busId, {
        $pull: { pendingBookings: { userId: req.user.id } },
      }).catch(cleanupErr => {
        console.error('Error cleaning up pending bookings:', {
          message: cleanupErr.message,
          stack: cleanupErr.stack,
        });
      });
    }
    res.status(500).json({
      error: 'Failed to create booking',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error, please try again later',
    });
  }
});

// Cancel a booking
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    const { reason } = req.body;

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ error: 'Cancellation reason must be at least 3 characters long' });
    }

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to cancel this booking' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason.trim();
    booking.isChatEnabled = false;
    await booking.save();

    const bus = await Bus.findById(booking.busId);
    if (!bus) {
      return res.status(404).json({ error: 'Associated bus not found' });
    }

    await Bus.findByIdAndUpdate(
      booking.busId,
      { $pull: { bookedSeats: { $in: booking.seatsBooked } } }
    );

    sendCancellationEmail(booking, bus).catch(err => console.error('Cancellation email failed:', err.message));

    const io = req.app.get('io');
    if (io) {
      io.to(booking._id.toString()).emit('bookingStatusUpdate', {
        bookingId: booking._id,
        status: booking.status,
        isChatEnabled: booking.isChatEnabled,
        cancellationReason: booking.cancellationReason,
      });
      // Emit busAlert for cancellation
      io.emit('busAlert', {
        busId: booking.busId,
        message: `Booking cancelled for ${bus.busName} (${booking.seatsBooked.length} seats)`,
        severity: 'low',
      });
    }

    res.json({
      message: 'Booking cancelled successfully',
      cancellationReason: booking.cancellationReason,
    });
  } catch (err) {
    console.error('Booking cancellation error:', err.message, err.stack);
    res.status(500).json({
      error: 'Failed to cancel booking',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// Complete a booking
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { actualDepartureTime, actualArrivalTime, earnings } = req.body;
    const driverId = req.user.id;

    if (!actualDepartureTime || !actualArrivalTime) {
      return res.status(400).json({ error: 'Actual departure and arrival times are required' });
    }
    if (earnings === undefined || earnings === null || isNaN(earnings) || earnings < 0) {
      return res.status(400).json({ error: 'Valid earnings amount is required' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const bus = await Bus.findById(booking.busId);
    if (!bus) {
      return res.status(404).json({ error: 'Associated bus not found' });
    }

    if (String(bus.driverId) !== String(driverId)) {
      return res.status(403).json({ error: 'You are not authorized to complete this journey' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Booking must be in confirmed status to mark as completed' });
    }

    // Check for delays
    const expectedArrival = new Date(bus.destinationTime);
    const actualArrival = new Date(actualArrivalTime);
    const delayMinutes = (actualArrival - expectedArrival) / (1000 * 60);
    if (delayMinutes > 30) {
      const io = req.app.get('io');
      if (io) {
        io.emit('busAlert', {
          busId: bus._id,
          message: `Bus ${bus.busName} delayed by ${Math.round(delayMinutes)} minutes`,
          severity: 'high',
        });
      }
    }

    booking.status = 'completed';
    booking.actualDepartureTime = new Date(actualDepartureTime);
    booking.actualArrivalTime = new Date(actualArrivalTime);
    booking.earnings = earnings;
    booking.isChatEnabled = false;
    await booking.save();

    await User.findByIdAndUpdate(
      driverId,
      { $inc: { earnings } },
      { runValidators: false }
    );


    const io = req.app.get('io');
    if (io) {
      io.to(booking._id.toString()).emit('bookingStatusUpdate', {
        bookingId: booking._id,
        status: 'completed',
        isChatEnabled: booking.isChatEnabled,
      });
      console.log(`Broadcasted bookingStatusUpdate to booking room ${booking._id}:`, {
        status: 'completed',
        isChatEnabled: booking.isChatEnabled,
      });
    }

    res.status(200).json({ message: 'Booking marked as completed successfully', earnings });
  } catch (err) {
    console.error('Error marking booking as completed:', err.message, err.stack);
    res.status(500).json({
      error: 'Failed to mark booking as completed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// bookingRoutes.js
router.post('/:id/confirm-group', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const booking = await Booking.findById(id);
    if (!booking || !booking.isGroupBooking) {
      return res.status(404).json({ error: 'Group booking not found' });
    }

    const member = booking.groupMembers.find(m => m.email === email);
    if (!member) {
      return res.status(400).json({ error: 'Email not found in group booking' });
    }

    member.isConfirmed = true;
    await booking.save();

    res.json({ message: 'Group booking participation confirmed' });
  } catch (err) {
    console.error('Group confirmation error:', err.message);
    res.status(500).json({ error: 'Failed to confirm group booking' });
  }
});

// Fetch group messages for a booking
router.get('/:bookingId/group-messages', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId).populate('userId', 'name email');
    if (!booking || !booking.isGroupBooking) {
      return res.status(404).json({ error: 'Group booking not found' });
    }

    const isGroupLead = booking.groupLeadUserId.toString() === userId;
    const isGroupMember = booking.groupMembers.some(
      member =>
        (member.userId && member.userId.toString() === userId) ||
        (member.email && member.email === userId && member.isConfirmed)
    );
    if (!isGroupLead && !isGroupMember) {
      return res.status(403).json({ error: 'Unauthorized to access group chat' });
    }

    const messages = await GroupMessage.find({ bookingId })
      .sort({ createdAt: 1 })
      .lean();

    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      bookingId: msg.bookingId,
      senderId: msg.senderId,
      senderName: msg.senderName || (mongoose.Types.ObjectId.isValid(msg.senderId) ? 'Anonymous' : msg.senderId),
      message: msg.message,
      timestamp: msg.timestamp.toISOString(),
    }));

    res.json({
      messages: formattedMessages,
      groupMembers: booking.groupMembers.map(member => ({
        userId: member.userId || null,
        email: member.email,
        name: member.userId ? (member.userId.name || member.email || 'Anonymous') : member.email,
        isConfirmed: member.isConfirmed,
      })),
    });
  } catch (err) {
    console.error('Group messages fetch error:', err.message);
    res.status(500).json({
      error: 'Failed to fetch group messages',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// bookingRoutes.js
router.get('/social/:busId', authenticate, async (req, res) => {
  try {
    const { busId } = req.params;
    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ error: 'Bus not found' });

    const hasBooking = await Booking.exists({ busId, userId: req.user.id, status: 'confirmed' });
    const isDriver = bus.driverId?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!hasBooking && !isDriver && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized: You must have a confirmed booking on this bus to view social travel data.' });
    }

    const bookings = await Booking.find({
      busId,
      status: 'confirmed',
      allowSocialTravel: true,
    })
      .populate('userId', 'name email')
      .lean();

    const passengers = bookings.map(booking => ({
      bookingId: booking._id,
      userId: booking.userId?._id || null,
      name: booking.userId?.name || booking.contactDetails.name || 'Anonymous',
      email: booking.contactDetails.email,
      seats: booking.seatsBooked,
    }));

    res.json({
      groupChatRoomId: bus.groupChatRoomId,
      passengers,
    });
  } catch (err) {
    console.error('Social travel fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch social travel data' });
  }
});

// Get user bookings
router.get('/mybookings', authenticate, async (req, res) => {
  try {
    let bookings = [];
    const now = new Date();
    if (req.user.role === 'driver') {
      const buses = await Bus.find({ driverId: req.user.id });
      if (buses.length === 0) {
        return res.json({
          count: 0,
          bookings: [],
        });
      }
      const busIds = buses.map(bus => bus._id);
      bookings = await Booking.find({ busId: { $in: busIds } })
        .select('busId userId seatsBooked totalFare travelDate status contactDetails passengers fareBreakdown trackingLink boardingPoint actualDepartureTime actualArrivalTime departureTime destinationTime earnings isChatEnabled cancellationReason isGroupBooking allowSocialTravel ratingId amenityRatings delayNotice')
        .populate({
          path: 'busId',
          select: 'busName busNumber source destination departureTime destinationTime isTrackingEnabled driverId',
          populate: {
            path: 'driverId',
            select: 'name',
          },
        })
        .populate('userId', 'name email')
        .lean();
    } else {
      bookings = await Booking.find({ userId: req.user.id })
        .select('busId userId seatsBooked totalFare travelDate status contactDetails passengers fareBreakdown trackingLink boardingPoint actualDepartureTime actualArrivalTime departureTime destinationTime earnings isChatEnabled cancellationReason isGroupBooking allowSocialTravel ratingId amenityRatings delayNotice')
        .populate({
          path: 'busId',
          select: 'busName busNumber source destination departureTime destinationTime isTrackingEnabled driverId',
          populate: {
            path: 'driverId',
            select: 'name',
          },
        })
        .populate('userId', 'name email')
        .lean();
    }

    const updatedBookings = bookings.map((booking) => {
      const travelDate = new Date(booking.travelDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isChatEnabled =
        booking.status === 'confirmed' &&
        travelDate >= today;

      return {
        ...booking,
        isChatEnabled,
      };
    });

    const validBookings = updatedBookings.filter(b => b.busId !== null);

    res.json({
      count: validBookings.length,
      bookings: validBookings.map(b => {
        const bookingObj = b.toObject ? b.toObject() : b;  // Safely convert if needed

        return {
          ...bookingObj,
          travelDate: bookingObj.travelDate?.toISOString().split('T')[0],
          departureTime: bookingObj.departureTime?.toISOString(),
          destinationTime: bookingObj.destinationTime?.toISOString(),
          actualDepartureTime: bookingObj.actualDepartureTime?.toISOString(),
          actualArrivalTime: bookingObj.actualArrivalTime?.toISOString(),
          busDetails: bookingObj.busId || {},
          busId: bookingObj.busId?._id || null,
          driverId: bookingObj.busId?.driverId?._id || null,
          driverName: bookingObj.busId?.driverId?.name || 'N/A',
          fareBreakdown: bookingObj.fareBreakdown,
          boardingPoint: bookingObj.boardingPoint,
          trackingLink: bookingObj.trackingLink,
          isChatEnabled: bookingObj.isChatEnabled,
          earnings: bookingObj.earnings,
          cancellationReason: bookingObj.cancellationReason,
          allowSocialTravel: bookingObj.allowSocialTravel,
          delayNotice: bookingObj.delayNotice,
        };
      }),
    });

  } catch (err) {
    console.error('Error fetching user bookings:', err.message, err.stack);
    res.status(500).json({
      error: 'Failed to fetch bookings',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// Get booking trends (last 24 hours)
router.get('/trends', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    console.log(`Fetching trends from ${startDate.toISOString()} to ${endDate.toISOString()}`); // Debug log
    const trends = await Booking.aggregate([
      {
        $match: {
          bookingDate: { $gte: startDate, $lte: endDate }, // Changed from createdAt to bookingDate
          status: 'confirmed',
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:00',
              date: '$bookingDate', // Changed from createdAt to bookingDate
              timezone: 'Asia/Kolkata', // Ensure IST
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id': 1 },
      },
      {
        $project: {
          hour: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);
    console.log('Booking trends:', trends); // Debug log
    res.json({ trends });
  } catch (err) {
    console.error('Error fetching booking trends:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get booking status breakdown
router.get('/status-breakdown', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    const breakdown = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
    console.log('Booking status breakdown:', breakdown);
    res.json({ breakdown });
  } catch (err) {
    console.error('Error fetching booking status breakdown:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get daily booking trends (last 30 days)
router.get('/daily-trends', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const now = new Date();
    const startTime = subDays(now, 30);

    console.log('Fetching daily booking trends from:', startTime.toISOString(), 'to', now.toISOString());

    // Check if bookings exist in the range
    const bookingCount = await Booking.countDocuments({
      bookingDate: { $gte: startTime, $lte: now },
    });
    console.log('Bookings in date range:', bookingCount);

    const bookings = await Booking.aggregate([
      {
        $match: {
          bookingDate: {
            $gte: startTime,
            $lte: now,
            $exists: true,
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$bookingDate',
              // Comment out timezone if database uses UTC
              // timezone: 'Asia/Kolkata',
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    console.log('Daily aggregated bookings:', bookings);

    const trends = [];
    for (let i = 0; i <= 30; i++) {
      const day = startOfDay(subDays(now, 30 - i));
      const dateStr = day.toISOString().split('T')[0];
      const match = bookings.find(b => b._id === dateStr);
      trends.push({
        day: dateStr,
        count: match ? match.count : 0,
      });
    }

    console.log('Daily trends array:', trends);
    res.json({ trends });
  } catch (err) {
    console.error('Error in /daily-trends:', err.message, err.stack);
    res.status(500).json({
      error: 'Failed to fetch daily booking trends',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// Get daily revenue trends (last 30 days, confirmed bookings only)
router.get('/revenue-trends', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const now = new Date();
    const nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const startTime = subDays(nowIST, 30);


    console.log('Fetching revenue trends from:', startTime.toISOString(), 'to', now.toISOString());

    // Check if confirmed bookings exist in the range
    const bookingCount = await Booking.countDocuments({
      bookingDate: {
        $gte: startTime,
        $lte: new Date(), // Still in UTC, safe
      },

      status: 'confirmed',
    });
    console.log('Confirmed bookings in date range:', bookingCount);

    const bookings = await Booking.aggregate([
      {
        $match: {
          bookingDate: {
            $gte: startTime,
            $lte: now,
            $exists: true,
            $ne: null,
          },
          status: 'confirmed',
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$bookingDate',
              // Comment out timezone if database uses UTC
              timezone: 'Asia/Kolkata',
            },
          },
          revenue: { $sum: '$totalFare' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    console.log('Aggregated revenue data:', bookings);

    const trends = [];
    for (let i = 0; i <= 30; i++) {
      const day = startOfDay(subDays(nowIST, 30 - i));
      const dateStr = day.toISOString().split('T')[0];
      const match = bookings.find(b => b._id === dateStr);
      trends.push({
        day: dateStr,
        revenue: match ? match.revenue : 0,
      });
    }

    console.log('Final revenue trends:', trends);
    res.json({ trends });
  } catch (err) {
    console.error('Error in /revenue-trends:', err.message, err.stack);
    res.status(500).json({
      error: 'Failed to fetch revenue trends',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});


// Get today's revenue
router.get('/today-revenue', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Compute IST bounds
    const now = new Date();
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    console.log('Fetching revenue for today from:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

    // Debug: Fetch matching bookings
    const matchingBookings = await Booking.find({
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: 'confirmed',
      totalFare: { $gte: 0 }
    }).select('_id bookingDate totalFare status');

    console.log('Matching bookings:', matchingBookings.map(b => ({
      _id: b._id.toString(),
      bookingDate: b.bookingDate.toISOString(),
      totalFare: b.totalFare,
      status: b.status
    })));

    // Aggregate revenue
    const result = await Booking.aggregate([
      {
        $match: {
          bookingDate: {
            $gte: startOfDay,
            $lte: endOfDay
          },
          status: 'confirmed',
          totalFare: { $gte: 0 }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalFare' },
          bookings: {
            $push: {
              _id: '$_id',
              bookingDate: '$bookingDate',
              totalFare: '$totalFare',
              status: '$status'
            }
          }
        }
      }
    ]);

    const output = result.length > 0 ? result[0] : { revenue: 0, bookings: [] };
    console.log('Aggregation result:', {
      revenue: output.revenue,
      bookings: output.bookings.map(b => ({
        _id: b._id.toString(),
        bookingDate: b.bookingDate.toISOString(),
        totalFare: b.totalFare,
        status: b.status
      }))
    });
    console.log('Today\'s revenue:', output.revenue);

    res.set('Cache-Control', 'no-store');
    res.json({ revenue: output.revenue });
  } catch (err) {
    console.error('Error fetching today\'s revenue:', err.message, err.stack);
    res.status(500).json({
      error: 'Failed to fetch today\'s revenue',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Public route to get booking details by ID for guest group members
router.get('/public/:id/:email', async (req, res) => {
  try {
    const { id, email } = req.params;
    const booking = await Booking.findById(id)
      .select('busId seatsBooked travelDate contactDetails passengers isGroupBooking groupMembers')
      .populate({
        path: 'busId',
        select: 'busName busNumber source destination departureTime destinationTime',
      });

    if (!booking || !booking.isGroupBooking) {
      return res.status(404).json({ error: 'Group booking not found' });
    }

    const isMember = booking.groupMembers.some(m => m.email === email);
    const isLead = booking.contactDetails?.email === email;

    if (!isMember && !isLead) {
      return res.status(403).json({ error: 'Access Denied: You are not authorized to view this group booking.' });
    }

    res.json({
      _id: booking._id,
      busDetails: booking.busId,
      seatsBooked: booking.seatsBooked,
      travelDate: booking.travelDate,
      contactDetails: booking.contactDetails,
      passengers: booking.passengers,
    });
  } catch (err) {
    console.error('Error fetching public group booking:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific booking
router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .select('busId userId seatsBooked totalFare travelDate status contactDetails passengers fareBreakdown trackingLink boardingPoint actualDepartureTime actualArrivalTime earnings isChatEnabled cancellationReason allowSocialTravel isGroupBooking groupSize groupLeadUserId groupMembers')
      .populate({
        path: 'busId',
        select: 'busName busNumber source destination departureTime destinationTime isTrackingEnabled driverId',
        populate: {
          path: 'driverId',
          select: 'name',
        },
      })
      .populate('userId', 'name email');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isOwner = booking.userId?._id?.toString() === req.user.id || 
                    booking.groupLeadUserId?.toString() === req.user.id ||
                    booking.groupMembers?.some(m => m.userId?.toString() === req.user.id);
    const isDriver = booking.busId?.driverId?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isDriver && !isAdmin) {
      return res.status(403).json({ error: 'Access Denied: Unauthorized to view this booking' });
    }

    const now = new Date();
    const isChatEnabled = booking.status !== 'completed' && booking.status !== 'cancelled' && new Date(booking.travelDate) >= now;

    res.json({
      ...booking._doc,
      travelDate: booking.travelDate.toISOString().split('T')[0],
      busDetails: booking.busId,
      busId: booking.busId?._id,
      driverId: booking.busId?.driverId?._id || null,
      driverName: booking.busId?.driverId?.name || 'N/A',
      fareBreakdown: booking.fareBreakdown,
      boardingPoint: booking.boardingPoint,
      trackingLink: booking.trackingLink,
      isChatEnabled,
      actualDepartureTime: booking.actualDepartureTime?.toISOString(),
      actualArrivalTime: booking.actualArrivalTime?.toISOString(),
      earnings: booking.earnings,
      cancellationReason: booking.cancellationReason,
      allowSocialTravel: booking.allowSocialTravel,
      isGroupBooking: booking.isGroupBooking,
      groupSize: booking.groupSize,
      groupLeadUserId: booking.groupLeadUserId,
      groupMembers: booking.groupMembers,
      delayNotice: booking.delayNotice,

    });
  } catch (err) {
    console.error('Error fetching booking:', err.message, err.stack);
    res.status(500).json({
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// Get bookings for a driver
router.get('/driver/:driverId', authenticate, async (req, res) => {
  try {
    const { driverId } = req.params;
    if (req.user.role !== 'driver' || req.user.id !== driverId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const buses = await Bus.find({ driverId });
    if (buses.length === 0) {
      return res.json({
        count: 0,
        bookings: [],
      });
    }

    const busIds = buses.map(bus => bus._id);
    const bookings = await Booking.find({ busId: { $in: busIds } })
      .select('busId userId seatsBooked totalFare travelDate status contactDetails passengers fareBreakdown trackingLink boardingPoint actualDepartureTime actualArrivalTime earnings isChatEnabled cancellationReason allowSocialTravel')
      .populate({
        path: 'busId',
        select: 'busName busNumber source destination departureTime destinationTime isTrackingEnabled driverId',
        populate: {
          path: 'driverId',
          select: 'name',
        },
      })
      .populate('userId', 'name email')
      .lean();

    const updatedBookings = bookings.map((booking) => {
      const travelDate = new Date(booking.travelDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isChatEnabled =
        booking.status === 'confirmed' &&
        travelDate >= today;

      return {
        ...booking,
        isChatEnabled,
      };
    });

    const bookingsWithUnread = await Promise.all(
      updatedBookings.map(async (booking) => {
        const unreadMessages = await Message.countDocuments({
          bookingId: booking._id,
          readBy: { $ne: driverId },
        });
        return {
          ...booking,
          travelDate: booking.travelDate.toISOString().split('T')[0],
          busDetails: booking.busId || {},
          busId: booking.busId?._id || null,
          driverId: booking.busId?.driverId?._id || null,
          driverName: booking.busId?.driverId?.name || 'N/A',
          fareBreakdown: booking.fareBreakdown,
          boardingPoint: booking.boardingPoint,
          trackingLink: booking.trackingLink,
          isChatEnabled: booking.isChatEnabled,
          unreadMessages,
          actualDepartureTime: booking.actualDepartureTime?.toISOString(),
          actualArrivalTime: booking.actualArrivalTime?.toISOString(),
          earnings: booking.earnings,
          cancellationReason: booking.cancellationReason,
          allowSocialTravel: booking.allowSocialTravel,
        };
      })
    );

    const validBookings = bookingsWithUnread.filter(b => b.busId !== null);
    res.json(validBookings);
  } catch (err) {
    console.error('Error fetching driver bookings:', err.message, err.stack);
    res.status(500).json({
      error: 'Failed to fetch bookings',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});
router.get('/user', authenticate, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).populate('busId', 'source destination');
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:bookingId/group-member/:email', async (req, res) => {
  try {
    const { bookingId, email } = req.params;
    const booking = await Booking.findById(bookingId);

    if (!booking || !booking.isGroupBooking) {
      return res.status(404).json({ error: 'Booking not found or not a group booking' });
    }

    const member = booking.groupMembers.find(m => m.email === email && m.isConfirmed);
    if (!member) {
      return res.status(403).json({ error: 'You are not a confirmed group member' });
    }

    return res.json({
      allowed: true,
      name: email,
      bookingId,
    });
  } catch (err) {
    console.error('Group chat link access error:', err.message);
    res.status(500).json({ error: 'Internal error verifying group link' });
  }
});

router.get('/:bookingId/public-group-passengers/:email', async (req, res) => {
  try {
    const { bookingId, email } = req.params;
    const booking = await Booking.findById(bookingId).populate('userId', 'name email');
    if (!booking || !booking.isGroupBooking) {
      return res.status(404).json({ error: 'Group booking not found' });
    }

    const isLeadPassenger = booking.contactDetails?.email === email;
    const isConfirmedGroupMember = booking.groupMembers.some(m => m.email === email && m.isConfirmed);

    if (!isLeadPassenger && !isConfirmedGroupMember) {
      return res.status(403).json({ error: 'Access denied. You are not authorized to view group passengers.' });
    }

    const passengers = booking.passengers.map((p, index) => ({
      name: p.name || `Passenger ${index + 1}`,
      seats: [booking.seatsBooked[index] || '?'],
      email: booking.contactDetails.email,
      userId: booking.userId?._id || null,
      bookingId: booking._id,
    }));

    res.json({ passengers });
  } catch (err) {
    console.error('Error fetching public group passengers:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:bookingId/public-group-messages/:email', async (req, res) => {
  try {
    const { bookingId, email } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking || !booking.isGroupBooking) {
      return res.status(404).json({ error: 'Group booking not found' });
    }

    const isLeadPassenger = booking.contactDetails?.email === email;
    const isConfirmedGroupMember = booking.groupMembers.some(m => m.email === email && m.isConfirmed);

    if (!isLeadPassenger && !isConfirmedGroupMember) {
      return res.status(403).json({ error: 'Access denied. You are not authorized to view this chat.' });
    }

    const messages = await GroupMessage.find({ bookingId })
      .sort({ createdAt: 1 })
      .lean();

    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      bookingId: msg.bookingId,
      senderId: msg.senderId,
      senderName: msg.senderName || (mongoose.Types.ObjectId.isValid(msg.senderId) ? 'Anonymous' : msg.senderId),
      message: msg.message,
      timestamp: msg.timestamp.toISOString(),
    }));

    res.json({ messages: formattedMessages });
  } catch (err) {
    console.error('Error fetching public group messages:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Notify delay
router.post('/:id/delay', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { delayNotice } = req.body;
    const userId = req.user.id;

    const booking = await Booking.findById(id).populate('busId');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (String(booking.busId.driverId) !== String(userId)) {
      return res.status(403).json({ error: 'Not authorized to report delay for this booking' });
    }

    booking.delayNotice = delayNotice;
    await booking.save();

    // Send email
    sendDelayNoticeEmail(booking, delayNotice)
      .catch(err => console.error('Delay notice email failed:', err.message));

    // Emit via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(booking._id.toString()).emit('delayNoticeUpdate', {
        bookingId: booking._id,
        delayNotice
      });
      console.log(`Emitted delayNoticeUpdate for booking ${id}:`, { bookingId: booking._id, delayNotice }); // Debug log
    }

    res.json({ message: 'Delay notice sent and saved' });
  } catch (err) {
    console.error('Delay notice error:', err.message);
    res.status(500).json({ error: 'Failed to send delay notice' });
  }
});




module.exports = router;
