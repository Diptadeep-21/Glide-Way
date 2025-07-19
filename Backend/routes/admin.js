const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Bus = require('../models/Bus');
const Booking = require('../models/Booking');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const restrictTo = require('../middleware/restrictTo');

// Restrict all routes to admins only
router.use(authenticate, restrictTo('admin'));

// ManageBus: Get all buses with booking counts
router.get('/buses', async (req, res) => {
  try {
    console.log('GET /api/admin/buses called'); // Debug log
    const buses = await Bus.find()
      .populate('driverId', 'name email')
      .lean();

    // Add booking count for each bus
    const busesWithCounts = await Promise.all(
      buses.map(async (bus) => {
        const bookingCount = await Booking.countDocuments({ busId: bus._id });
        return {
          ...bus,
          bookingCount,
        };
      })
    );

    res.json(busesWithCounts);
  } catch (err) {
    console.error('Error fetching buses:', err);
    res.status(500).json({ error: 'Failed to fetch buses' });
  }
});

// ManageBus: Update a bus
router.put('/buses/:id', async (req, res) => {
  try {
    const { busName, busNumber, source, destination, date, departureTime, destinationTime, totalSeats, fare, driverId } = req.body;
    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      {
        busName,
        busNumber,
        source,
        destination,
        date: new Date(date),
        departureTime: new Date(departureTime),
        destinationTime: new Date(destinationTime),
        totalSeats,
        fare,
        driverId,
      },
      { new: true }
    );
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    res.json(bus);
  } catch (err) {
    console.error('Error updating bus:', err);
    res.status(500).json({ error: 'Failed to update bus' });
  }
});

// ManageBus: Delete a bus
router.delete('/buses/:id', async (req, res) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    // Optionally, delete associated bookings
    await Booking.deleteMany({ busId: req.params.id });
    res.json({ message: 'Bus deleted successfully' });
  } catch (err) {
    console.error('Error deleting bus:', err);
    res.status(500).json({ error: 'Failed to delete bus' });
  }
});

// ManageDriver: Get all drivers with bus counts
router.get('/drivers', async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' }).lean();

    // Add bus count for each driver
    const driversWithCounts = await Promise.all(
      drivers.map(async (driver) => {
        const busCount = await Bus.countDocuments({ driverId: driver._id });
        return {
          ...driver,
          busCount,
        };
      })
    );

    res.json(driversWithCounts);
  } catch (err) {
    console.error('Error fetching drivers:', err);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// ManageDriver: Update a driver
router.put('/drivers/:id', async (req, res) => {
  try {
    const { name, email } = req.body;
    const driver = await User.findByIdAndUpdate(
      req.params.id,
      { name, email },
      { new: true }
    );
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(driver);
  } catch (err) {
    console.error('Error updating driver:', err);
    res.status(500).json({ error: 'Failed to update driver' });
  }
});

// ManageDriver: Delete a driver
router.delete('/drivers/:id', async (req, res) => {
  try {
    const driver = await User.findByIdAndDelete(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    // Optionally, remove driverId from buses
    await Bus.updateMany({ driverId: req.params.id }, { $unset: { driverId: '' } });
    res.json({ message: 'Driver deleted successfully' });
  } catch (err) {
    console.error('Error deleting driver:', err);
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

// ManageRoute: Get all routes with bus and booking counts
router.get('/routes', async (req, res) => {
  try {
    // Aggregate unique routes (source-destination pairs)
    const routes = await Bus.aggregate([
      {
        $group: {
          _id: { source: '$source', destination: '$destination' },
          busCount: { $sum: 1 },
          busIds: { $push: '$_id' },
        },
      },
      {
        $project: {
          source: '$_id.source',
          destination: '$_id.destination',
          busCount: 1,
          busIds: 1,
          _id: 0,
        },
      },
    ]);

    // Add booking count for each route
    const routesWithCounts = await Promise.all(
      routes.map(async (route) => {
        const bookingCount = await Booking.countDocuments({ busId: { $in: route.busIds } });
        return {
          ...route,
          bookingCount,
        };
      })
    );

    res.json(routesWithCounts);
  } catch (err) {
    console.error('Error fetching routes:', err);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// ManageRoute: Delete a route (deletes all buses on that route)
router.delete('/routes', async (req, res) => {
  try {
    const { source, destination } = req.body;
    const buses = await Bus.find({ source, destination });
    const busIds = buses.map(bus => bus._id);

    // Delete buses
    await Bus.deleteMany({ source, destination });
    // Delete associated bookings
    await Booking.deleteMany({ busId: { $in: busIds } });

    res.json({ message: 'Route and associated buses/bookings deleted successfully' });
  } catch (err) {
    console.error('Error deleting route:', err);
    res.status(500).json({ error: 'Failed to delete route' });
  }
});

module.exports = router;