const express = require('express');
const multer = require('multer');
const router = express.Router();
const authenticate = require('../middleware/auth');
const Booking = require('../models/Booking');
const Bus = require('../models/Bus');
const { getAssignedBuses, getBookingsByBus } = require('../controllers/bookingController');

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Add a new bus
router.post('/add', authenticate, upload.single('image'), async (req, res) => {
  try {
    const {
      source,
      destination,
      date,
      departureTime,
      arrivalTime,
      destinationTime,
      busName,
      busNumber,
      totalSeats,
      fare,
      haltingTime,
      boardingPoints,
      busType
    } = req.body;

    console.log('Received busType:', busType); // Debug log

    if (![45, 54].includes(Number(totalSeats))) {
      return res.status(400).json({ error: 'Total seats must be 45 or 54' });
    }

    let parsedBoardingPoints = [];
    if (boardingPoints) {
      try {
        parsedBoardingPoints = typeof boardingPoints === 'string' ? JSON.parse(boardingPoints) : boardingPoints;
        if (!Array.isArray(parsedBoardingPoints)) {
          return res.status(400).json({ error: 'boardingPoints must be an array' });
        }
      } catch (err) {
        return res.status(400).json({ error: 'Invalid boardingPoints format' });
      }
    }

    // Validate busType
    const validBusTypes = ['AC', 'Non-AC Seater', 'Sleeper', 'Volvo', 'Primo'];
    if (busType && !validBusTypes.includes(busType)) {
      return res.status(400).json({ error: `Invalid busType. Must be one of: ${validBusTypes.join(', ')}` });
    }

    const newBus = new Bus({
      driverId: req.user.id,
      source,
      destination,
      date: date ? new Date(date) : undefined,
      departureTime: departureTime ? new Date(departureTime) : undefined,
      arrivalTime: arrivalTime ? new Date(arrivalTime) : undefined,
      destinationTime: destinationTime ? new Date(destinationTime) : undefined,
      busName,
      busNumber,
      totalSeats: Number(totalSeats),
      fare: Number(fare),
      image: req.file ? req.file.filename : null,
      isTrackingEnabled: false,
      currentLocation: null,
      haltingTime: haltingTime || null,
      boardingPoints: parsedBoardingPoints,
      busType: busType || 'AC', // Ensure default if not provided
    });

    await newBus.save();
    console.log('Saved bus with busType:', newBus.busType); // Debug log
    res.status(201).json({ message: 'Bus added successfully', bus: newBus });
  } catch (err) {
    console.error("Error in /add route:", err);
    res.status(500).json({ error: 'Failed to add bus', details: err.message });
  }
});

// Reserve seats
router.post('/:id/reserve-seats', authenticate, async (req, res) => {
  try {
    const { seats } = req.body;
    const userId = req.user.id;
    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    const busDate = new Date(bus.date).toISOString().split('T')[0];
    const bookings = await Booking.find({
      busId: bus._id,
      travelDate: {
        $gte: new Date(busDate),
        $lt: new Date(new Date(busDate).getTime() + 24 * 60 * 60 * 1000),
      },
      status: 'confirmed',
    });

    const bookedSeats = [...new Set(bookings.flatMap(booking => booking.seatsBooked))];

    const now = new Date();
    const pendingSeats = [...new Set(
      bus.pendingBookings
        .filter(pb => pb.userId.toString() !== userId && pb.expiresAt > now)
        .flatMap(pb => pb.seats)
    )];

    const allTakenSeats = [...new Set([...bookedSeats, ...pendingSeats])];
    const conflictingSeats = seats.filter(seat => allTakenSeats.includes(seat));

    if (conflictingSeats.length > 0) {
      return res.status(409).json({
        error: 'Some seats are already booked or reserved',
        conflictingSeats,
        availableSeats: Array.from({ length: bus.totalSeats }, (_, i) => i + 1).filter(
          seat => !allTakenSeats.includes(seat)
        ),
      });
    }

    await Bus.findByIdAndUpdate(bus._id, {
      $pull: { pendingBookings: { userId } },
    });

    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    await Bus.findByIdAndUpdate(bus._id, {
      $push: {
        pendingBookings: {
          seats,
          userId,
          expiresAt,
        },
      },
    });

    console.log(`Seats ${seats} reserved for user ${userId} on bus ${bus._id} until ${expiresAt}`);

    res.json({ message: 'Seats reserved successfully', expiresAt });
  } catch (err) {
    console.error('Error reserving seats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/bus/:busId/location - Driver updates bus location
router.post('/:busId/location', authenticate, async (req, res) => {
  const { busId } = req.params;
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  try {
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    if (bus.driverId?.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to update this bus' });
    }

    bus.currentLocation = {
      latitude,
      longitude,
      timestamp: new Date(),
    };
    bus.isTrackingEnabled = true;
    await bus.save();

    const io = req.app.get('io');
    if (io) {
      const locationData = { busId, latitude, longitude, timestamp: new Date().toISOString() };
      io.to(busId).emit('locationUpdate', locationData);
      io.to('admin').emit('locationUpdate', locationData);
      console.log(`Emitted locationUpdate to bus room ${busId} and admin room`);
    } else {
      console.warn('Socket.IO not initialized');
    }

    res.status(200).json({ message: 'Location updated' });
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/bus/:busId/tracking - Toggle tracking status
router.put('/:busId/tracking', authenticate, async (req, res) => {
  try {
    const { busId } = req.params;
    const { isTrackingEnabled } = req.body;

    console.log(`Updating tracking for bus ${busId}: isTrackingEnabled=${isTrackingEnabled}`);

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    if (bus.driverId?.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to update tracking status' });
    }

    const updateData = {
      isTrackingEnabled,
      currentLocation: isTrackingEnabled
        ? bus.currentLocation
        : { latitude: null, longitude: null, timestamp: null },
    };

    const updatedBus = await Bus.findByIdAndUpdate(
      busId,
      updateData,
      { new: true, runValidators: true }
    );

    const io = req.app.get('io');
    if (io) {
      const trackingData = { busId, isTrackingEnabled };
      io.to(busId).emit('trackingStatusUpdate', trackingData);
      io.to('admin').emit('trackingStatusUpdate', trackingData);
      io.to('driverRoom').emit('trackingStatusUpdate', trackingData);
      console.log(`Emitted trackingStatusUpdate to bus room ${busId}, admin, and driverRoom`);
    }

    res.json({ message: 'Tracking status updated', bus: updatedBus });
  } catch (err) {
    console.error('Error updating tracking status:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get all buses by driver
router.get('/mybuses', authenticate, async (req, res) => {
  try {
    const buses = await Bus.find({ driverId: req.user.id });
    const busesWithImages = buses.map(bus => ({
      ...bus.toObject(),
      imageUrl: bus.image ? `${process.env.SERVER_URL}/Uploads/${bus.image}` : null,
      currentLocation: bus.currentLocation,
      isTrackingEnabled: bus.isTrackingEnabled,
      haltingTime: bus.haltingTime,
      boardingPoints: bus.boardingPoints
    }));
    res.json(busesWithImages);
  } catch (err) {
    console.error('Error fetching driver buses:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a bus
router.put('/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    if (bus.driverId?.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to update this bus' });
    }

    const {
      source,
      destination,
      date,
      departureTime,
      arrivalTime,
      destinationTime,
      busName,
      busNumber,
      totalSeats,
      fare,
      isTrackingEnabled,
      haltingTime,
      boardingPoints,
      busType
    } = req.body;

    console.log('Received busType for update:', busType); // Debug log

    if (totalSeats && ![45, 54].includes(Number(totalSeats))) {
      return res.status(400).json({ error: 'Total seats must be 45 or 54' });
    }

    let parsedBoardingPoints = bus.boardingPoints;
    if (boardingPoints) {
      try {
        parsedBoardingPoints = typeof boardingPoints === 'string' ? JSON.parse(boardingPoints) : boardingPoints;
        if (!Array.isArray(parsedBoardingPoints)) {
          return res.status(400).json({ error: 'boardingPoints must be an array' });
        }
      } catch (err) {
        return res.status(400).json({ error: 'Invalid boardingPoints format' });
      }
    }

    // Validate busType
    const validBusTypes = ['AC', 'Non-AC Seater', 'Sleeper', 'Volvo', 'Primo'];
    if (busType && !validBusTypes.includes(busType)) {
      return res.status(400).json({ error: `Invalid busType. Must be one of: ${validBusTypes.join(', ')}` });
    }

    const updateData = {
      source: source || bus.source,
      destination: destination || bus.destination,
      date: date ? new Date(date) : bus.date,
      departureTime: departureTime ? new Date(departureTime) : bus.departureTime,
      arrivalTime: arrivalTime ? new Date(arrivalTime) : bus.arrivalTime,
      destinationTime: destinationTime ? new Date(destinationTime) : bus.destinationTime,
      busName: busName || bus.busName,
      busNumber: busNumber || bus.busNumber,
      totalSeats: totalSeats ? Number(totalSeats) : bus.totalSeats,
      fare: fare ? Number(fare) : bus.fare,
      image: req.file ? req.file.filename : bus.image,
      haltingTime: haltingTime !== undefined ? haltingTime : bus.haltingTime,
      boardingPoints: parsedBoardingPoints,
      busType: busType || bus.busType // Preserve existing busType if not provided
    };

    if (typeof isTrackingEnabled === 'boolean') {
      updateData.isTrackingEnabled = isTrackingEnabled;
      if (!isTrackingEnabled) {
        updateData.currentLocation = {
          latitude: null,
          longitude: null,
          timestamp: null,
        };
      }
    }

    const updatedBus = await Bus.findByIdAndUpdate(req.params.id, updateData, { new: true });

    console.log('Updated bus with busType:', updatedBus.busType); // Debug log

    const io = req.app.get('io');
    if (io && typeof updateData.isTrackingEnabled === 'boolean') {
      const trackingData = { busId: updatedBus._id.toString(), isTrackingEnabled: updateData.isTrackingEnabled };
      io.to(updatedBus._id.toString()).emit('trackingStatusUpdate', trackingData);
      io.to('admin').emit('trackingStatusUpdate', trackingData);
      io.to('driverRoom').emit('trackingStatusUpdate', trackingData);
      console.log(`Emitted trackingStatusUpdate to bus room ${updatedBus._id}, admin room, and driverRoom`);
    }

    res.json({ message: 'Bus updated successfully', bus: updatedBus });
  } catch (err) {
    console.error('Error updating bus:', err);
    res.status(500).json({ error: 'Failed to update bus', details: err.message });
  }
});

// Get all buses (admin/public view)
router.get('/all', async (req, res) => {
  try {
    console.log('Received request to /api/bus/all'); // Log when the request is received
    const buses = await Bus.find();
    console.log('Raw buses from MongoDB:', buses); // Log the raw query result
    const busesWithDetails = buses.map(bus => {
      console.log('Processing bus:', bus); // Log each bus being processed
      return {
        ...bus.toObject(),
        imageUrl: bus.image ? `${process.env.SERVER_URL}/Uploads/${bus.image}` : null,
        currentLocation: bus.currentLocation,
        isTrackingEnabled: bus.isTrackingEnabled,
        haltingTime: bus.haltingTime,
        boardingPoints: bus.boardingPoints
      };
    });
    console.log('Buses with details to send:', busesWithDetails); // Log the final response
    res.json({ buses: busesWithDetails });
  } catch (err) {
    console.error('Error fetching all buses:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/bus/search?from=X&to=Y&date=Z
router.get('/search', async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({ error: 'Missing query parameters' });
    }

    // Trim and lowercase source & destination for robust match
    const trimmedFrom = from.trim().toLowerCase();
    const trimmedTo = to.trim().toLowerCase();

    // Normalize the input date to a full day range
    const travelDate = new Date(date);
    if (isNaN(travelDate)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    const startOfDay = new Date(travelDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(travelDate.setHours(23, 59, 59, 999));

    // Fetch buses matching source, destination, and exact date
    const buses = await Bus.find({
      $expr: {
        $and: [
          { $eq: [{ $toLower: { $trim: { input: "$source" } } }, trimmedFrom] },
          { $eq: [{ $toLower: { $trim: { input: "$destination" } } }, trimmedTo] },
          { $gte: ["$date", startOfDay] },
          { $lt: ["$date", endOfDay] },
        ],
      },
    });

    const busesWithDetails = buses.map((bus) => ({
      ...bus.toObject(),
      imageUrl: bus.image ? `${process.env.SERVER_URL}/Uploads/${bus.image}` : null,
    }));

    res.json({ buses: busesWithDetails });
  } catch (err) {
    console.error('Error searching buses:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bus type distribution
router.get('/type-distribution', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    const distribution = await Bus.aggregate([
      {
        $group: {
          _id: '$busType',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
    console.log('Bus type distribution:', distribution);
    res.json({ distribution });
  } catch (err) {
    console.error('Error fetching bus type distribution:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get assigned buses
router.get('/assigned', authenticate, getAssignedBuses);

// Get bookings for a specific bus
router.get('/bookings/bus/:busId', authenticate, getBookingsByBus);

// POST /api/bus/:busId/maintenance
router.post('/:busId/maintenance', authenticate, async (req, res) => {
  try {
    const { busId } = req.params;
    const { date, type, notes } = req.body;

    console.log(`Scheduling maintenance for bus ${busId}:`, { date, type, notes }); // Debug log

    // Validate input
    if (!date || !type) {
      return res.status(400).json({ error: 'Date and type are required' });
    }
    if (!['routine', 'repair'].includes(type)) {
      return res.status(400).json({ error: 'Invalid maintenance type. Must be "routine" or "repair"' });
    }

    // Only admins can schedule maintenance
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to schedule maintenance' });
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    // Add new maintenance record
    const newMaintenance = {
      date: new Date(date),
      type,
      notes: notes || null,
      completed: false,
      createdAt: new Date(),
    };
    bus.maintenance.push(newMaintenance);

    await bus.save();

    console.log(`Maintenance scheduled for bus ${busId}:`, bus.maintenance); // Debug log

    res.status(201).json({ message: 'Maintenance scheduled successfully', maintenance: bus.maintenance });
  } catch (err) {
    console.error('Error scheduling maintenance:', err);
    res.status(500).json({ error: 'Failed to schedule maintenance', details: err.message });
  }
});

// GET /api/bus/:busId/maintenance
router.get('/:busId/maintenance', authenticate, async (req, res) => {
  try {
    const { busId } = req.params;

    console.log(`Fetching maintenance for bus ${busId}`); // Debug log

    // Only admins or the assigned driver can view maintenance records
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    if (req.user.role !== 'admin' && bus.driverId?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view maintenance records' });
    }

    console.log(`Maintenance records for bus ${busId}:`, bus.maintenance); // Debug log

    res.json({ maintenance: bus.maintenance || [] });
  } catch (err) {
    console.error('Error fetching maintenance records:', err);
    res.status(500).json({ error: 'Failed to fetch maintenance records', details: err.message });
  }
});


// Delete a bus
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const deletedBus = await Bus.findOneAndDelete({
      _id: req.params.id,
      driverId: req.user.id,
    });

    if (!deletedBus) {
      return res.status(404).json({ error: 'Bus not found or unauthorized' });
    }

    res.json({ message: 'Bus deleted successfully' });
  } catch (err) {
    console.error('Error deleting bus:', err);
    res.status(500).json({ error: 'Failed to delete bus', details: err.message });
  }
});

// Get bus by ID
router.get('/:id', async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id).populate('driverId', 'name');
    if (!bus) return res.status(404).json({ error: 'Bus not found' });

    const busDate = new Date(bus.date).toISOString().split('T')[0];
    const bookings = await Booking.find({
      busId: bus._id,
      travelDate: {
        $gte: new Date(busDate),
        $lt: new Date(new Date(busDate).getTime() + 24 * 60 * 60 * 1000),
      },
      status: 'confirmed',
    });

    const bookedSeats = [...new Set(bookings.flatMap(booking => booking.seatsBooked))];

    const now = new Date();
    const pendingSeats = [...new Set(
      bus.pendingBookings
        .filter(pb => pb.expiresAt > now)
        .flatMap(pb => pb.seats)
    )];

    const userPendingSeats = req.user
      ? [...new Set(
        bus.pendingBookings
          .filter(pb => pb.userId?.toString() === req.user.id && pb.expiresAt > now)
          .flatMap(pb => pb.seats)
      )]
      : [];

    const allTakenSeats = [...new Set([...bookedSeats, ...pendingSeats])];

    if (JSON.stringify(bus.bookedSeats) !== JSON.stringify(bookedSeats)) {
      console.warn(
        `Discrepancy in bookedSeats for bus ${bus._id}: ` +
        `Database bookedSeats = ${JSON.stringify(bus.bookedSeats)}, ` +
        `Calculated bookedSeats = ${JSON.stringify(bookedSeats)}`
      );
      await Bus.findByIdAndUpdate(bus._id, { bookedSeats });
    }

    console.log(`Bus ${bus._id} - Confirmed booked seats: ${bookedSeats}, Pending seats: ${pendingSeats}, User pending seats: ${userPendingSeats}`);

    res.json({
      bus: {
        ...bus.toObject(),
        bookings, // Include full bookings array
        departureTime: bus.departureTime,
        destinationTime: bus.destinationTime,
        bookedSeats,
        pendingSeats,
        userPendingSeats,
        allTakenSeats,
        imageUrl: bus.image ? `${process.env.SERVER_URL}/Uploads/${bus.image}` : null,
        currentLocation: bus.currentLocation,
        isTrackingEnabled: bus.isTrackingEnabled,
        haltingTime: bus.haltingTime,
        boardingPoints: bus.boardingPoints,
      }
    });
  } catch (err) {
    console.error('Error fetching bus by ID:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});


module.exports = router;