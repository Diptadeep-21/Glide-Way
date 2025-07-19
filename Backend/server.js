const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const busRoutes = require('./routes/bus');
const uploadRoutes = require('./routes/upload');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chat');
const Bus = require('./models/Bus');
const Message = require('./models/Message');
const GroupMessage = require('./models/GroupMessage'); // New import
const Booking = require('./models/Booking');
const User = require('./models/User');
const Driver = require('./models/Driver');
const Rating = require('./models/Rating');
const amenitiesRoutes = require('./routes/amenities');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 120000,
  pingInterval: 25000,
});

app.set('io', io);

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const activeDrivers = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  if (socket.handshake.query.role === 'admin') {
    socket.join('admin');
    console.log(`Client ${socket.id} joined admin room`);
  }

  socket.on('joinBusRoom', ({ busId, bookingId, userId }) => {
    Bus.findById(busId).then(bus => {
      if (bus) {
        socket.join(bus.groupChatRoomId);
        console.log(`User ${userId} joined bus group chat room ${bus.groupChatRoomId}`);
      }
    });
  });

  socket.on('joinGroupChatRoom', async ({ bookingId, userId }) => {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking || !booking.isGroupBooking) {
        socket.emit('error', { message: 'Group booking not found' });
        return;
      }
      const isGroupLead = booking.groupLeadUserId.toString() === userId;
      const isGroupMember = booking.groupMembers.some(
        member =>
          (member.userId && member.userId.toString() === userId) ||
          (member.email && member.email === userId && member.isConfirmed)
      );

      if (!isGroupLead && !isGroupMember) {
        socket.emit('error', { message: 'Unauthorized to join group chat' });
        return;
      }
      socket.join(bookingId);
      console.log(`User ${userId} joined group chat room for booking ${bookingId}`);
    } catch (err) {
      console.error(`Error joining group chat room ${bookingId}:`, err);
      socket.emit('error', { message: 'Failed to join group chat' });
    }
  });

socket.on('sendGroupMessage', async ({ bookingId, userId, message, timestamp }) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking || !booking.isGroupBooking) {
      socket.emit('error', { message: 'Group booking not found' });
      return;
    }
    const isGroupLead = booking.groupLeadUserId.toString() === userId;
    const isGroupMember = booking.groupMembers.some(
      member =>
        (member.userId && member.userId.toString() === userId) ||
        (member.email && member.email === userId && member.isConfirmed)
    );
    if (!isGroupLead && !isGroupMember) {
      socket.emit('error', { message: 'Unauthorized to send message' });
      return;
    }
    if (!message.trim()) {
      socket.emit('error', { message: 'Message cannot be empty' });
      return;
    }

    let senderName = 'Anonymous';
    let senderModel = 'User';

    if (mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findById(userId);
      senderName = user ? user.name || user.email || 'Anonymous' : 'Anonymous';
    } else {
      // Assume userId is an email for non-logged-in users
      senderName = userId;
      senderModel = 'Guest';
    }

    const newMessage = new GroupMessage({
      bookingId,
      senderId: userId,
      senderModel,
      senderName,
      message: message.trim(),
      timestamp: new Date(timestamp || Date.now()),
      recipientType: 'group',
    });

    const savedMessage = await newMessage.save();

    const broadcastMessage = {
      _id: savedMessage._id,
      bookingId: savedMessage.bookingId,
      senderId: userId,
      senderName,
      message: savedMessage.message,
      timestamp: savedMessage.timestamp.toISOString(),
    };

    io.to(bookingId).emit('groupMessage', broadcastMessage);
    console.log(`Broadcasted group message to room ${bookingId}:`, broadcastMessage);
  } catch (err) {
    console.error(`Failed to send group message for booking ${bookingId}:`, err);
    socket.emit('error', { message: 'Failed to send group message' });
  }
});
  socket.on('joinBusRoom', (busId) => {
    socket.join(busId);
    console.log(`Client ${socket.id} joined bus room ${busId}`);
    if (!activeDrivers.has(busId)) {
      activeDrivers.set(busId, { socketId: socket.id, disconnectTimeout: null });
      console.log(`Client ${socket.id} is the driver for bus ${busId}`);
    } else {
      console.log(`Client ${socket.id} is a viewer for bus ${busId}`);
    }
  });

  socket.on('joinDriverRoom', (room) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined driver room ${room}`);
  });

  socket.on('locationUpdate', async ({ busId, latitude, longitude, timestamp }) => {
    console.log(`Received location update for bus ${busId}:`, { latitude, longitude, timestamp });
    try {
      const updatedBus = await Bus.findByIdAndUpdate(
        busId,
        {
          currentLocation: {
            latitude,
            longitude,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
          },
          isTrackingEnabled: true,
        },
        { new: true }
      );
      if (!updatedBus) {
        console.error(`Bus ${busId} not found for location update`);
        return;
      }
      const locationData = {
        busId,
        latitude,
        longitude,
        timestamp: timestamp || new Date().toISOString(),
      };
      io.to(busId).emit('locationUpdate', locationData);
      io.to('admin').emit('locationUpdate', locationData);
      console.log(`Broadcasted location update to bus room ${busId} and admin room`);
    } catch (err) {
      console.error(`Failed to update location for bus ${busId}:`, err);
    }
  });

  socket.on('trackingStatusUpdate', async ({ busId, isTrackingEnabled }) => {
    console.log(`Received tracking status update for bus ${busId}:`, { isTrackingEnabled });
    try {
      const bus = await Bus.findById(busId);
      if (!bus) {
        console.error(`Bus ${busId} not found`);
        return;
      }
      bus.isTrackingEnabled = isTrackingEnabled;
      bus.currentLocation = isTrackingEnabled
        ? bus.currentLocation
        : { latitude: null, longitude: null, timestamp: null };
      await bus.save();
      const trackingData = { busId, isTrackingEnabled };
      io.to(busId).emit('trackingStatusUpdate', trackingData);
      io.to('admin').emit('trackingStatusUpdate', trackingData);
      io.to('driverRoom').emit('trackingStatusUpdate', trackingData);
      console.log(`Broadcasted trackingStatusUpdate to bus room ${busId}, admin room, and driverRoom`);
      if (!isTrackingEnabled && activeDrivers.has(busId)) {
        const driverInfo = activeDrivers.get(busId);
        if (driverInfo.disconnectTimeout) {
          clearTimeout(driverInfo.disconnectTimeout);
          driverInfo.disconnectTimeout = null;
          activeDrivers.set(busId, driverInfo);
          console.log(`Cleared disconnect timeout for bus ${busId}`);
        }
        activeDrivers.delete(busId);
        console.log(`Removed bus ${busId} from activeDrivers`);
      }
    } catch (err) {
      console.error(`Failed to update tracking status for bus ${busId}:`, err);
    }
  });

  socket.on('leaveBusRoom', (busId) => {
    socket.leave(busId);
    console.log(`Client ${socket.id} left bus room ${busId}`);
  });

  socket.on('leaveDriverRoom', (room) => {
    socket.leave(room);
    console.log(`Client ${socket.id} left driver room ${room}`);
  });

  socket.on('joinRoom', ({ bookingId }) => {
    if (!bookingId) {
      console.error('No bookingId provided for joinRoom');
      socket.emit('error', { message: 'No bookingId provided for joinRoom' });
      return;
    }
    socket.join(bookingId);
    console.log(`Client ${socket.id} joined chat room for booking ${bookingId}`);
  });

  socket.on('sendMessage', async ({ bookingId, senderId, senderModel, content, timestamp, clientTempId }) => {
    console.log('Received sendMessage:', { bookingId, senderId, senderModel, content, timestamp, clientTempId });
    try {
      if (!bookingId || !senderId || !senderModel || !content) {
        const errorMsg = 'Missing required fields for sendMessage';
        console.error(errorMsg, { bookingId, senderId, senderModel, content });
        socket.emit('error', { message: errorMsg, data: { bookingId, senderId, senderModel, content } });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        const errorMsg = 'Invalid booking ID';
        console.error(errorMsg, { bookingId });
        socket.emit('error', { message: errorMsg, bookingId });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(senderId)) {
        const errorMsg = 'Invalid sender ID';
        console.error(errorMsg, { senderId });
        socket.emit('error', { message: errorMsg, senderId });
        return;
      }
      if (!['User', 'Driver'].includes(senderModel)) {
        const errorMsg = 'Invalid sender model';
        console.error(errorMsg, { senderModel });
        socket.emit('error', { message: errorMsg, senderModel });
        return;
      }
      if (!content.trim()) {
        const errorMsg = 'Message content cannot be empty';
        console.error(errorMsg);
        socket.emit('error', { message: errorMsg });
        return;
      }

      const bookingExists = await Booking.findById(bookingId);
      if (!bookingExists) {
        const errorMsg = 'Booking does not exist';
        console.error(errorMsg, { bookingId });
        socket.emit('error', { message: errorMsg, bookingId });
        return;
      }

      let senderExists = false;
      let senderName = senderModel === 'Driver' ? 'Driver' : 'Passenger';
      if (senderModel === 'User') {
        const user = await User.findById(senderId);
        senderExists = !!user;
        if (user) senderName = user.name || senderName;
      } else if (senderModel === 'Driver') {
        const driver = await Driver.findById(senderId);
        senderExists = !!driver;
        if (driver) senderName = driver.name || senderName;
      }
      if (!senderExists) {
        console.warn(`Sender does not exist in ${senderModel} collection, proceeding with default name`, { senderId, senderModel });
      }

      const newMessage = new Message({
        bookingId,
        senderId,
        senderModel,
        content: content.trim(),
        timestamp: new Date(timestamp || Date.now()),
      });

      console.log('Saving message to database:', newMessage);
      const savedMessage = await newMessage.save();
      console.log(`Message successfully saved: ${savedMessage._id}`);

      const populatedMessage = await Message.findById(savedMessage._id)
        .populate('senderId', 'name')
        .lean();

      if (!populatedMessage) {
        console.error(`Failed to find message after saving: ${savedMessage._id}`);
        socket.emit('error', { message: 'Failed to retrieve saved message' });
        return;
      }

      const broadcastMessage = {
        _id: populatedMessage._id,
        bookingId: populatedMessage.bookingId,
        senderId: {
          _id: populatedMessage.senderId?._id || senderId,
          name: senderName,
        },
        senderModel: populatedMessage.senderModel,
        message: populatedMessage.content,
        timestamp: populatedMessage.timestamp.toISOString(),
        clientTempId: clientTempId,
      };

      io.to(bookingId).emit('receiveMessage', broadcastMessage);
      console.log(`Broadcasted chat message to chat room ${bookingId}:`, broadcastMessage);
    } catch (err) {
      console.error(`Failed to save or broadcast chat message for booking ${bookingId}:`, err);
      socket.emit('error', { message: 'Failed to send message', details: err.message, stack: err.stack });
    }
  });

  socket.on('messageRead', async ({ bookingId, userId }) => {
    if (!bookingId || !userId) {
      console.error('Missing required fields for messageRead:', { bookingId, userId });
      socket.emit('error', { message: 'Missing required fields for messageRead', data: { bookingId, userId } });
      return;
    }
    try {
      await Message.updateMany(
        { bookingId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );
      console.log(`Marked messages as read for user ${userId} in booking ${bookingId}`);
    } catch (err) {
      console.error(`Failed to mark messages as read for booking ${bookingId}:`, err);
      socket.emit('error', { message: 'Failed to mark messages as read', details: err.message });
    }
  });

  socket.on('leaveRoom', ({ bookingId }) => {
    if (!bookingId) {
      console.error('No bookingId provided for leaveRoom');
      socket.emit('error', { message: 'No bookingId provided for leaveRoom' });
      return;
    }
    socket.leave(bookingId);
    console.log(`Client ${socket.id} left chat room for booking ${bookingId}`);
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);
    for (const [busId, driverInfo] of activeDrivers.entries()) {
      if (driverInfo.socketId === socket.id) {
        console.log(`Driver for bus ${busId} disconnected, marking as inactive`);
        activeDrivers.delete(busId);
        console.log(`Tracking state for bus ${busId} remains unchanged; waiting for explicit stop or session end`);
      }
    }
  });

});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
    heartbeatFrequencyMS: 10000,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.error('MongoDB disconnected');
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authentication token required' });

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// API to submit a rating (unchanged)
app.post('/api/ratings', authenticateToken, async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  const userId = req.user.id || req.user._id;

  try {
    const booking = await Booking.findOne({ _id: bookingId, userId });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or you are not authorized' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Journey must be completed to submit a rating' });
    }
    if (booking.ratingId) {
      return res.status(400).json({ message: 'You have already rated this journey' });
    }
    const newRating = new Rating({
      bookingId,
      userId,
      rating,
      comment,
    });
    await newRating.save();
    booking.ratingId = newRating._id;
    await booking.save();
    res.status(201).json({ message: 'Rating submitted successfully', rating: newRating });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API to get a rating for a booking (unchanged)
app.get('/api/ratings/:bookingId', authenticateToken, async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id || req.user._id;

  try {
    const booking = await Booking.findOne({ _id: bookingId, userId });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or you are not authorized' });
    }
    if (!booking.ratingId) {
      return res.status(404).json({ message: 'No rating found for this booking' });
    }
    const rating = await Rating.findById(booking.ratingId);
    if (!rating) {
      return res.status(404).json({ message: 'Rating not found' });
    }
    res.status(200).json(rating);
  } catch (error) {
    console.error('Error fetching rating:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API to get the average rating for a bus (unchanged)
app.get('/api/bus/:busId/average-rating', async (req, res) => {
  const { busId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(400).json({ message: 'Invalid bus ID' });
    }
    const bookings = await Booking.find({ busId });
    if (!bookings || bookings.length === 0) {
      return res.status(200).json({ averageRating: null, totalRatings: 0 });
    }
    const bookingIds = bookings.map(booking => booking._id);
    const ratings = await Rating.find({ bookingId: { $in: bookingIds } });
    if (!ratings || ratings.length === 0) {
      return res.status(200).json({ averageRating: null, totalRatings: 0 });
    }
    const totalRatings = ratings.length;
    const sumRatings = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    const averageRating = (sumRatings / totalRatings).toFixed(1);
    res.status(200).json({ averageRating: parseFloat(averageRating), totalRatings });
  } catch (error) {
    console.error('Error fetching average rating:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API to get bookings for a specific bus (unchanged)
app.get('/api/bookings/bus/:busId', authenticateToken, async (req, res) => {
  const { busId } = req.params;
  const driverId = req.user.id || req.user._id;

  try {
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }
    if (String(bus.driverId) !== String(driverId)) {
      return res.status(403).json({ message: 'You are not authorized to view bookings for this bus' });
    }
    const bookings = await Booking.find({ busId })
      .populate('userId', 'name')
      .lean();
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings for bus:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API for driver to mark a booking as completed (unchanged)
app.put('/api/bookings/:bookingId/complete', authenticateToken, async (req, res) => {
  const { bookingId } = req.params;
  const driverId = req.user.id || req.user._id;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const bus = await Bus.findById(booking.busId);
    if (!bus) {
      return res.status(404).json({ message: 'Associated bus not found' });
    }
    if (String(bus.driverId) !== String(driverId)) {
      return res.status(403).json({ message: 'You are not authorized to complete this journey' });
    }
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ message: 'Journey must be confirmed to mark as completed' });
    }
    booking.status = 'completed';
    await booking.save();
    io.to(bookingId).emit('bookingStatusUpdate', { bookingId, status: 'completed' });
    console.log(`Broadcasted bookingStatusUpdate to booking room ${bookingId}:`, { status: 'completed' });
    res.status(200).json({ message: 'Journey marked as completed' });
  } catch (error) {
    console.error('Error completing journey:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/bus', busRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));
app.use('/api/upload', uploadRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/amenities', amenitiesRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
});

app.get('/', (req, res) => {
  res.send("GlideWay API is live ✅");
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
