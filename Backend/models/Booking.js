
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  seatsBooked: {
    type: [Number],
    required: true,
    validate: {
      validator: async function (seats) {
        if (!seats.every(seat => Number.isInteger(seat) && seat >= 1)) {
          return false;
        }
        const Bus = mongoose.model('Bus');
        const bus = await Bus.findById(this.busId);
        if (!bus) {
          return false;
        }
        return seats.every(seat => seat <= bus.totalSeats);
      },
      message: 'Invalid seat number detected for this bus',
    },
  },
  totalFare: {
    type: Number,
    required: true,
    min: [0, 'Total fare cannot be negative'],
  },
  bookingDate: {
    type: Date,
    default: Date.now,
  },
  travelDate: {
    type: Date,
    required: true,
  },
  destinationTime: {
    type: Date,
    required: true
  },
  departureTime: {
  type: Date,
  required: true
},

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending',
  },
  ratingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rating',
    default: null,
  },
  contactDetails: {
    email: { type: String, required: true },
    phone: { type: String, required: true },
    altPhone: String,
    state: { type: String, required: true },
  },
  passengers: [{
    name: { type: String, required: true },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },
    age: { type: Number, required: true, min: [1, 'Age must be at least 1'] },
  }],
  fareBreakdown: {
    baseFare: { type: Number, min: 0 },
    dynamicSurcharge: { type: Number, min: 0 },
    windowSeatSurcharge: { type: Number, min: 0 },
    baseFarePerSeat: { type: Number, min: 0 },
    dynamicFarePerSeat: { type: Number, min: 0 },
    windowSeatCount: { type: Number, min: 0 },
    demandMultiplier: { type: Number, min: 1 },
    timeMultiplier: { type: Number, min: 1 },
    urgencyMultiplier: { type: Number, min: 1 },
    availabilityMultiplier: { type: Number, min: 1 },
  },
  trackingLink: {
    type: String,
    default: null,
  },
  isChatEnabled: {
    type: Boolean,
    default: true, // Changed to true to enable chat by default
  },
  boardingPoint: {
    type: String,
    default: null,
  },
  actualDepartureTime: {
    type: Date,
    default: null,
  },
  actualArrivalTime: {
    type: Date,
    default: null,
  },
  cancellationReason: {
    type: String,
    default: null,
  },
  amenityRatings: [{
    amenity: { type: String, enum: ['wifi', 'cleanliness', 'seats', 'charging', 'other'], required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 500 },
    submittedAt: { type: Date, default: Date.now },
  }],
  isGroupBooking: {
    type: Boolean,
    default: false,
  },
  groupSize: {
    type: Number,
    default: 1,
    min: [1, 'Group size must be at least 1'],
  },
  groupLeadUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  delayNotice: {
  type: String,
  default: null
},

  groupMembers: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      email: { type: String, default: null }, // For non-registered users
      isConfirmed: { type: Boolean, default: false }, // Whether member confirmed their participation
    },
  ],
  allowSocialTravel: {
    type: Boolean,
    default: true, // Passengers can opt-in to social travel
  },
});


module.exports = mongoose.model('Booking', bookingSchema);
