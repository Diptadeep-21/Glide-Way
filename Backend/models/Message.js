const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderModel', // Use senderModel to dynamically reference User or Driver
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['User', 'Driver'], // Restrict to valid models
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  readBy: [{ type: mongoose.Schema.Types.ObjectId }], // Track who has read the message
});

// Add index for efficient querying
messageSchema.index({ bookingId: 1, timestamp: 1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;