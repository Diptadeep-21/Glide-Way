const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Bus = require('../models/Bus');
const authenticate = require('../middleware/auth');

// Submit amenity feedback
router.post('/feedback/:bookingId', authenticate, async (req, res) => {
  const { bookingId } = req.params;
  const { amenityRatings } = req.body; // Array of { amenity, rating, comment }
  const userId = req.user.id || req.user._id;


   console.log('Submitting amenity feedback for booking:', bookingId);
  console.log('Authenticated user ID:', userId);


  try {
    const booking = await Booking.findOne({ _id: bookingId, userId });
    
    if (!booking) {
        console.warn('Booking not found or unauthorized', { bookingId, userId });
      return res.status(404).json({ error: 'Booking not found or not authorized' });
    }

    // Validate amenityRatings
    if (!Array.isArray(amenityRatings) || amenityRatings.length === 0) {
      return res.status(400).json({ error: 'At least one amenity rating is required' });
    }

    for (const rating of amenityRatings) {
      if (!['wifi', 'cleanliness', 'seats', 'charging', 'other'].includes(rating.amenity)) {
        return res.status(400).json({ error: `Invalid amenity: ${rating.amenity}` });
      }
      if (!Number.isInteger(rating.rating) || rating.rating < 1 || rating.rating > 5) {
        return res.status(400).json({ error: `Invalid rating for ${rating.amenity}: must be 1-5` });
      }
      if (rating.comment && rating.comment.length > 500) {
        return res.status(400).json({ error: `Comment for ${rating.amenity} exceeds 500 characters` });
      }
    }

    // Prevent duplicate ratings for the same amenity
    const existingAmenities = booking.amenityRatings.map(r => r.amenity);
    const newAmenities = amenityRatings.map(r => r.amenity);
    const duplicates = newAmenities.filter(a => existingAmenities.includes(a));
    if (duplicates.length > 0) {
      return res.status(400).json({ error: `Duplicate ratings for: ${duplicates.join(', ')}` });
    }

    booking.amenityRatings.push(...amenityRatings);
    await booking.save();

    res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get aggregated amenity ratings for a bus
router.get('/ratings/:busId', async (req, res) => {
  const { busId } = req.params;

  try {
    const bookings = await Booking.find({ busId, 'amenityRatings.0': { $exists: true } });
    if (!bookings.length) {
      return res.status(200).json({ ratings: {} });
    }

    const ratings = {
      wifi: { total: 0, count: 0 },
      cleanliness: { total: 0, count: 0 },
      seats: { total: 0, count: 0 },
      charging: { total: 0, count: 0 },
      other: { total: 0, count: 0 },
    };

    bookings.forEach(booking => {
      booking.amenityRatings.forEach(r => {
        ratings[r.amenity].total += r.rating;
        ratings[r.amenity].count += 1;
      });
    });

    const aggregated = {};
    Object.keys(ratings).forEach(amenity => {
      if (ratings[amenity].count > 0) {
        aggregated[amenity] = {
          average: (ratings[amenity].total / ratings[amenity].count).toFixed(1),
          count: ratings[amenity].count,
        };
      }
    });

    res.status(200).json({ ratings: aggregated });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get detailed amenity ratings for a specific bus
router.get('/ratings/bus/:busId/details', authenticate, async (req, res) => {
  const { busId } = req.params;

  try {
    const bookings = await Booking.find({ busId, 'amenityRatings.0': { $exists: true } })
      .select('amenityRatings createdAt')
      .populate('userId', 'name email');

    console.log(`Found ${bookings.length} bookings for bus ${busId}`);
    if (!bookings.length) {
      return res.status(200).json({ ratings: [], averageRatings: {} });
    }

    const ratings = [];
    const aggregated = {
      wifi: { total: 0, count: 0 },
      cleanliness: { total: 0, count: 0 },
      seats: { total: 0, count: 0 },
      charging: { total: 0, count: 0 },
      other: { total: 0, count: 0 },
    };

    bookings.forEach(booking => {
      const bookingDate = booking.createdAt && !isNaN(new Date(booking.createdAt).getTime()) 
        ? booking.createdAt 
        : new Date(); // Fallback to current date
      console.log(`Booking ${booking._id} createdAt:`, booking.createdAt);
      booking.amenityRatings.forEach(r => {
        ratings.push({
          amenity: r.amenity,
          rating: r.rating,
          comment: r.comment || 'N/A',
          user: booking.userId ? `${booking.userId.name} (${booking.userId.email})` : 'Anonymous',
          date: bookingDate,
        });
        aggregated[r.amenity].total += r.rating;
        aggregated[r.amenity].count += 1;
      });
    });

    console.log(`Ratings for bus ${busId}:`, ratings);

    const averageRatings = {};
    Object.keys(aggregated).forEach(amenity => {
      if (aggregated[amenity].count > 0) {
        averageRatings[amenity] = {
          average: (aggregated[amenity].total / aggregated[amenity].count).toFixed(1),
          count: aggregated[amenity].count,
        };
      }
    });

    res.status(200).json({ ratings, averageRatings });
  } catch (error) {
    console.error('Error fetching detailed bus ratings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// In amenities.js
router.get('/amenity-analytics', authenticate, async (req, res) => {
  try {
    const bookings = await Booking.find({
      'amenityRatings.0': { $exists: true },
    }).select('amenityRatings busId createdAt');

    console.log(`Found ${bookings.length} bookings with amenity ratings`);
    if (bookings.length === 0) {
      console.warn('No bookings with amenity ratings found in the database');
      return res.status(200).json({
        averageRatings: {},
        trendData: [],
      });
    }

    const ratings = {
      wifi: { total: 0, count: 0 },
      cleanliness: { total: 0, count: 0 },
      seats: { total: 0, count: 0 },
      charging: { total: 0, count: 0 },
      other: { total: 0, count: 0 },
    };

    bookings.forEach(booking => {
      console.log(`Processing booking ${booking._id}:`, booking.amenityRatings);
      booking.amenityRatings.forEach(r => {
        if (ratings[r.amenity]) {
          ratings[r.amenity].total += r.rating;
          ratings[r.amenity].count += 1;
        }
      });
    });

    console.log('Aggregated ratings:', ratings);

    const averageRatings = {};
    for (const amenity in ratings) {
      const { total, count } = ratings[amenity];
      averageRatings[amenity] = count > 0 ? (total / count).toFixed(1) : '0.0';
    }

    res.status(200).json({
      averageRatings,
      trendData: [],
    });
  } catch (err) {
    console.error('Error fetching amenity analytics:', err);
    res.status(500).json({ error: 'Failed to fetch amenity analytics' });
  }
});



module.exports = router;