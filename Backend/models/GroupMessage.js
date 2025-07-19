const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.Mixed, // Allow ObjectId or String (email)
    required: true,
  },
  senderName: {
    type: String,
    required: false,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  recipientType: {
    type: String,
    enum: ['group'],
    default: 'group',
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
