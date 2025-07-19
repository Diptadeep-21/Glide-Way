import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import PropTypes from 'prop-types';
import axios from 'axios';

const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');

const GroupChat = ({ busId, bookingId, userId, userEmail, passengers }) => {
  const currentUser = userId || userEmail;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch stored messages from DB
  // Fetch stored messages from DB
useEffect(() => {
  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE}/api/bookings/${bookingId}/public-group-messages/${encodeURIComponent(currentUser)}`;
      const config = {};

      if (token && userId) {
        url = `${API_BASE}/api/bookings/${bookingId}/group-messages`;
        config.headers = { Authorization: `Bearer ${token}` };
      }

      const res = await axios.get(url, config);
      const history = res.data.messages.map(m => ({
        senderId: m.senderId,
        senderName: m.senderName,
        message: m.message,
        timestamp: new Date(m.timestamp).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));
      setMessages(history);
    } catch (err) {
      console.error('Error fetching group messages:', err);
      setError(err.response?.data?.error || 'Failed to load messages.');
    }
  };
  fetchMessages();
}, [bookingId, currentUser, userId]);

  // Join socket room and listen
  useEffect(() => {
    if (!bookingId || !currentUser) return;

    socket.emit('joinGroupChatRoom', { bookingId, userId: currentUser });

    socket.on('groupMessage', ({ bookingId: receivedBookingId, senderId, senderName, message, timestamp }) => {
      if (receivedBookingId.toString() === bookingId.toString()) {
        setMessages(prev => [
          ...prev,
          {
            senderId,
            senderName,
            message,
            timestamp: new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    });

    socket.on('error', ({ message }) => {
      setError(message);
    });

    return () => {
      socket.emit('leaveRoom', { bookingId });
      socket.off('groupMessage');
      socket.off('error');
    };
  }, [bookingId, currentUser]);

  const handleSendMessage = (e) => {
  e.preventDefault();
  if (!newMessage.trim()) return;

  const timestamp = new Date().toISOString();

  socket.emit('sendGroupMessage', {
    bookingId,
    userId: currentUser,
    message: newMessage.trim(),
    timestamp,
  });

  setNewMessage('');
};

  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <div className="border p-4 rounded-md bg-neutral-100 dark:bg-neutral-700 mt-4">
      <h4 className="text-md font-medium text-neutral-800 dark:text-neutral-100 mb-2">Group Chat</h4>
      <div className="mb-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Passengers in this group:</p>
        <ul className="list-disc pl-5 text-sm text-neutral-600 dark:text-neutral-400">
          {passengers.map((p, index) => (
            <li key={`${p.email || p.userId || index}-${index}`}>
              {p.name} (Seats: {p.seats.join(', ')})
            </li>
          ))}
        </ul>
      </div>

      <div className="h-64 overflow-y-auto mb-4 p-2 bg-white dark:bg-neutral-800 rounded-md">
        {messages.length === 0 ? (
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`mb-2 flex ${msg.senderId === currentUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs p-2 rounded-md ${
                  msg.senderId === currentUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-100'
                }`}
              >
                <p className="text-xs font-semibold">{msg.senderName}</p>
                <p>{msg.message}</p>
                <p className="text-xs text-neutral-300 dark:text-neutral-400">{msg.timestamp}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-neutral-200 dark:bg-neutral-800 px-3 py-2 rounded-md text-neutral-800 dark:text-neutral-100"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className={`px-4 py-2 rounded-md text-white ${
            newMessage.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'
          }`}
        >
          Send
        </button>
      </form>
    </div>
  );
};

GroupChat.propTypes = {
  busId: PropTypes.string,
  bookingId: PropTypes.string.isRequired,
  userId: PropTypes.string,
  userEmail: PropTypes.string,
  passengers: PropTypes.arrayOf(
    PropTypes.shape({
      bookingId: PropTypes.string,
      userId: PropTypes.string,
      name: PropTypes.string,
      email: PropTypes.string,
      seats: PropTypes.arrayOf(PropTypes.number),
    })
  ).isRequired,
};

export default GroupChat;