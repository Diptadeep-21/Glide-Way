const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Bus = require('../models/Bus');
const Booking = require('../models/Booking');
const Rating = require('../models/Rating');
const bcrypt = require('bcryptjs');
const { subDays } = require('date-fns');

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error('Fetch profile error:', err.message, err.stack);
        res.status(500).json({
            message: 'Server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
});

// Update current user profile
router.put('/me', authMiddleware, async (req, res) => {
    const { name, phone, password, email, licenseId } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (password) user.password = await bcrypt.hash(password, 10);
        if (email) {
            const sanitizedEmail = email.trim().replace(/['"]/g, '');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sanitizedEmail)) {
                return res.status(400).json({ message: 'Invalid email address' });
            }
            user.email = sanitizedEmail;
        }
        if (licenseId && user.role === 'driver') {
            user.licenseId = licenseId;
        } else if (licenseId && user.role !== 'driver') {
            return res.status(403).json({ message: 'Only drivers can set a license ID' });
        }

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                licenseId: user.licenseId,
            },
        });
    } catch (err) {
        console.error('Profile update error:', err.message, err.stack);
        if (err.code === 11000 && err.keyPattern?.licenseId) {
            return res.status(400).json({ message: 'License ID is already in use' });
        }
        res.status(500).json({
            message: 'Server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
});

// New endpoint: Get all drivers (admin only)
router.get('/drivers', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        const drivers = await User.find({ role: 'driver' })
            .select('_id name email earnings tripsCompleted averageRating')
            .lean();

        const driversWithDetails = await Promise.all(
            drivers.map(async (driver) => {
                const buses = await Bus.find({ driverId: driver._id });
                const busIds = buses.map(bus => bus._id);
                const bookings = await Booking.find({ busId: { $in: busIds } });
                const completedBookings = bookings.filter(b => b.status === 'completed');

                if (driver.tripsCompleted !== completedBookings.length) {
                    await User.updateOne(
                        { _id: driver._id },
                        { $set: { tripsCompleted: completedBookings.length } }
                    );
                    driver.tripsCompleted = completedBookings.length;
                }

                const bookingIds = bookings.map(b => b._id);
                const ratings = await Rating.find({ bookingId: { $in: bookingIds } });
                const avgRating = ratings.length > 0
                    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                    : null;

                if (driver.averageRating !== avgRating) {
                    await User.updateOne(
                        { _id: driver._id },
                        { $set: { averageRating: avgRating } }
                    );
                    driver.averageRating = avgRating;
                }

                return {
                    _id: driver._id,
                    name: driver.name,
                    tripsCompleted: driver.tripsCompleted || 0,
                    averageRating: driver.averageRating ? parseFloat(driver.averageRating.toFixed(1)) : null,
                    currentBus: driver.currentBus ? { busName: driver.currentBus.busName } : null,
                };
            })
        );

        console.log('Fetched drivers:', driversWithDetails);
        res.json({ drivers: driversWithDetails });
    } catch (err) {
        console.error('Error fetching drivers:', err.message, err.stack);
        res.status(500).json({
            message: 'Failed to fetch drivers',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
});

// Updated endpoint: Driver performance metrics
router.get('/driver/performance', authMiddleware, async (req, res) => {
    try {
        const driverId = req.user.id;

        const driver = await User.findById(driverId);
        if (!driver || driver.role !== 'driver') {
            return res.status(403).json({ message: 'Only drivers can access performance metrics' });
        }

        const buses = await Bus.find({ driverId });
        if (buses.length === 0) {
            return res.status(200).json({
                metrics: {
                    tripCompletionRate: 0,
                    punctualityRate: 0,
                    averageRating: driver.averageRating ? parseFloat(driver.averageRating.toFixed(1)) : null,
                    earnings: driver.earnings || 0,
                },
                historicalData: [],
                badges: driver.badges || [],
            });
        }

        const busIds = buses.map(bus => bus._id);
        const bookings = await Booking.find({ busId: { $in: busIds } });

        const completedBookings = bookings.filter(b => b.status === 'completed');
        if (driver.tripsCompleted !== completedBookings.length) {
            driver.tripsCompleted = completedBookings.length;
            // Only save if licenseId exists to avoid validation error
            if (driver.licenseId) {
                await driver.save();
            } else {
                console.warn(`Driver ${driverId} missing licenseId, skipping save for tripsCompleted`);
            }
        }

        // 1. Trip Completion Rate
        const totalTrips = bookings.length;
        const tripCompletionRate = totalTrips > 0 ? ((completedBookings.length / totalTrips) * 100).toFixed(1) : 0;

        // 2. Punctuality Rate
        let onTimeTrips = 0;
        for (const booking of completedBookings) {
            try {
                if (booking.actualDepartureTime && booking.busId) {
                    const bus = buses.find(b => b._id.toString() === booking.busId.toString());
                    if (bus?.departureTime) {
                        const delay = (new Date(booking.actualDepartureTime) - new Date(bus.departureTime)) / (1000 * 60);
                        if (delay <= 5) onTimeTrips += 1;
                    }
                }
            } catch (err) {
                console.warn(`Skipping punctuality calc for booking ${booking._id}:`, err.message);
                continue;
            }
        }
        const punctualityRate = completedBookings.length > 0 ? ((onTimeTrips / completedBookings.length) * 100).toFixed(1) : 0;

        // 3. Average Passenger Rating
        const bookingIds = bookings.map(booking => booking._id);
        const ratings = await Rating.find({ bookingId: { $in: bookingIds } });
        const averageRating = ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
            : null;

        if (driver.averageRating !== averageRating) {
            driver.averageRating = averageRating;
            // Only save if licenseId exists to avoid validation error
            if (driver.licenseId) {
                await driver.save();
            } else {
                console.warn(`Driver ${driverId} missing licenseId, skipping save for averageRating`);
            }
        }

        // 4. Earnings
        const earnings = driver.earnings || 0;

        // 5. Historical Data (last 30 days)
        const thirtyDaysAgo = subDays(new Date(), 30);
        const recentBookings = bookings.filter(booking => new Date(booking.travelDate) >= thirtyDaysAgo);
        const historicalData = [];
        for (let i = 29; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dateStr = date.toISOString().split('T')[0];
            const dayBookings = recentBookings.filter(booking =>
                new Date(booking.travelDate).toISOString().split('T')[0] === dateStr
            );
            const dayCompleted = dayBookings.filter(booking => booking.status === 'completed').length;
            let dayOnTime = 0;
            for (const booking of dayBookings) {
                try {
                    if (booking.status === 'completed' && booking.actualDepartureTime) {
                        const bus = buses.find(b => b._id.toString() === booking.busId.toString());
                        if (bus?.departureTime) {
                            const delay = (new Date(booking.actualDepartureTime) - new Date(bus.departureTime)) / (1000 * 60);
                            if (delay <= 5) dayOnTime += 1;
                        }
                    }
                } catch (err) {
                    console.warn(`Skipping punctuality calc for booking ${booking._id}:`, err.message);
                    continue;
                }
            }
            const dayRatings = await Rating.find({ bookingId: { $in: dayBookings.map(b => b._id) } });
            const avgDayRating = dayRatings.length > 0
                ? dayRatings.reduce((sum, rating) => sum + rating.rating, 0) / dayRatings.length
                : 0;
            historicalData.push({
                date: dateStr,
                completionRate: dayBookings.length > 0 ? ((dayCompleted / dayBookings.length) * 100).toFixed(1) : 0,
                punctualityRate: dayCompleted > 0 ? ((dayOnTime / dayCompleted) * 100).toFixed(1) : 0,
                averageRating: parseFloat(avgDayRating.toFixed(1)) || 0,
            });
        }

        // 6. Assign Badges
        const existingBadges = driver.badges || [];
        const newBadges = [];

        const recentCompletedBookings = recentBookings.filter(b => b.status === 'completed');
        const allOnTime = recentCompletedBookings.length > 0 && recentCompletedBookings.every(booking => {
            try {
                if (booking.actualDepartureTime && booking.busId) {
                    const bus = buses.find(b => b._id.toString() === booking.busId.toString());
                    if (bus?.departureTime) {
                        const delay = (new Date(booking.actualDepartureTime) - new Date(bus.departureTime)) / (1000 * 60);
                        return delay <= 5;
                    }
                }
                return false;
            } catch (err) {
                console.warn(`Skipping onTime check for booking ${booking._id}:`, err.message);
                return false;
            }
        });
        if (allOnTime && !existingBadges.some(b => b.name === 'Safe Driver')) {
            newBadges.push({
                name: 'Safe Driver',
                description: 'No delays in the last 30 days',
                awardedAt: new Date(),
            });
        }

        if (averageRating >= 4.5 && !existingBadges.some(b => b.name === 'Top Rated')) {
            newBadges.push({
                name: 'Top Rated',
                description: 'Achieved an average rating of 4.5 or higher',
                awardedAt: new Date(),
            });
        }

        const recentTripCompletionRate = recentBookings.length > 0
            ? (recentCompletedBookings.length / recentBookings.length) * 100
            : 0;
        if (recentTripCompletionRate === 100 && recentBookings.length > 0 && !existingBadges.some(b => b.name === 'Consistent Performer')) {
            newBadges.push({
                name: 'Consistent Performer',
                description: 'Completed 100% of trips in the last 30 days',
                awardedAt: new Date(),
            });
        }

        if (newBadges.length > 0) {
            driver.badges = [...existingBadges, ...newBadges];
            // Only save if licenseId exists to avoid validation error
            if (driver.licenseId) {
                await driver.save();
            } else {
                console.warn(`Driver ${driverId} missing licenseId, skipping save for badges`);
            }

            const io = req.app.get('io');
            if (io) {
                io.to(driverId).emit('newBadge', { driverId, badges: newBadges });
                io.emit('busAlert', {
                    driverId,
                    message: `${driver.name} earned ${newBadges.length} new badge(s)!`,
                    severity: 'low',
                });
            }
        }

        console.log(`Fetched performance metrics for driver ${driverId}:`, {
            tripCompletionRate,
            punctualityRate,
            averageRating,
            earnings,
        });

        res.status(200).json({
            metrics: {
                tripCompletionRate: parseFloat(tripCompletionRate),
                punctualityRate: parseFloat(punctualityRate),
                averageRating: averageRating ? parseFloat(averageRating.toFixed(1)) : null,
                earnings,
            },
            historicalData,
            badges: driver.badges,
        });
    } catch (err) {
        console.error('Error fetching driver performance:', err.message, err.stack);
        res.status(500).json({
            message: 'Server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
});

module.exports = router;