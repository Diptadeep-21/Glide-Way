const mongoose = require('mongoose');

// Define the bus schema
const busSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
  },
  busName: {
    type: String,
    required: true,
    //unique: true,
  },
  busNumber: {
    type: String,
    required: true,
    unique: true,
  },
  source: {
    type: String,
    required: true,
  },
  destination: {
    type: String,
    required: true,
  },
  destinationTime: {
    type: Date,
    required: true,
  },
  departureTime: {
    type: Date,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  arrivalTime: {
    type: Date,
  },
  busType: {
    type: String,
    enum: ['AC', 'Non-AC Seater', 'Sleeper', 'Volvo', 'Primo'],
    default: 'AC',
    required: true
  },
  totalSeats: {
    type: Number,
    required: true,
    min: [1, 'Total seats must be at least 1'],
    max: [54, 'Total seats cannot exceed 54'],
  },
  fare: {
    type: Number,
    required: true,
    min: [0, 'Fare cannot be negative'],
  },
  image: {
    type: String,
    default: null, // Stores filename of uploaded image
  },
  bookedSeats: {
    type: [Number],
    default: [],
    validate: {
      validator: seats => seats.every(seat => seat >= 1 && seat <= 54),
      message: 'Invalid seat number detected in bookedSeats',
    },
  },
  pendingBookings: [
    {
      seats: [Number],
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      expiresAt: {
        type: Date,
        required: true,
        index: { expires: '10m' },
      },
    },
  ],
  currentLocation: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    timestamp: { type: Date, default: null }
  },
  isTrackingEnabled: {
    type: Boolean,
    default: false
  },
  haltingTime: {
    type: String,
    default: null, // e.g., "30 minutes at Point A"
  },
  boardingPoints: {
    type: [String],
    default: [], // e.g., ["Point A", "Point B"]
  },
  maintenance: [
    {
      date: {
        type: Date,
        required: true,
      },
      type: {
        type: String,
        enum: ['routine', 'repair'],
        required: true,
      },
      completed: {
        type: Boolean,
        default: false,
      },
      notes: {
        type: String,
        default: null,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  groupChatRoomId: {
    type: String,
    default: () => `bus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique chat room ID
  },
});

busSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'busId',
});

busSchema.set('toJSON', { virtuals: true });
busSchema.set('toObject', { virtuals: true });

// Export the model, ensuring it's only compiled once
module.exports = mongoose.models.Bus || mongoose.model('Bus', busSchema);