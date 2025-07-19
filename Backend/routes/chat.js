const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');
require('../models/User');
require('../models/Driver');

router.get('/messages/:bookingId', auth, async (req, res) => {
  const { bookingId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }

    const messages = await Message.find({ bookingId })
      .sort({ timestamp: 1 })
      .populate('senderId', 'name');

    const formattedMessages = messages.map(msg => {
      if (!msg.senderId) {
        console.log('Message with missing senderId:', msg);
        return {
          ...msg.toObject(),
          senderId: {
            _id: msg.senderId || 'unknown',
            name: msg.senderModel === 'Driver' ? 'Driver' : 'Passenger',
          },
        };
      }
      return msg;
    });

    console.log('Returning messages:', formattedMessages);
    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

module.exports = router;