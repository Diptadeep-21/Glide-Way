const mongoose = require('mongoose'); // Add this import
const Booking = require('../models/Booking');
const Bus = require('../models/Bus');

const getBookingsByBus = async (req, res) => {
    try {
        const { busId } = req.params;
        const bookings = await Booking.find({ busId }).lean();
        res.status(200).json(bookings);
    } catch (error) {
        console.error('Error fetching bookings by bus:', error);
        res.status(500).json({ error: 'Server error while fetching bookings' });
    }
};

const getAssignedBuses = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            console.error('No user or missing user ID in request');
        }

        console.log('req.user:', req.user);
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const driverId = req.user.id;
        if (!driverId) {
            return res.status(400).json({ message: 'Driver ID not found in token' });
        }

        // Validate driverId as a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(driverId)) {
            return res.status(400).json({ message: 'Invalid Driver ID format' });
        }

        console.log('driverId:', driverId);
        // Check database connection state
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ message: 'Database not connected' });
        }

        // Filter for future trips (departureTime >= current time)
        const currentTime = new Date();
        const buses = await Bus.find({
            driverId,
            departureTime: { $gte: currentTime },
        }).lean();

        console.log('buses found:', buses);
        res.status(200).json(buses);
    } catch (error) {
        console.error('Error fetching assigned buses:', error);
        res.status(500).json({ message: 'Failed to fetch assigned buses', error: error.message });
    }
};

const getBusById = async (req, res) => {
    try {
        const { busId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(busId)) {
            return res.status(400).json({ message: 'Invalid Bus ID format' });
        }

        const bus = await Bus.findById(busId).lean();
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        res.status(200).json(bus);
    } catch (error) {
        console.error('Error fetching bus by ID:', error);
        res.status(500).json({ message: 'Failed to fetch bus', error: error.message });
    }
};

module.exports = { getBookingsByBus, getAssignedBuses, getBusById };