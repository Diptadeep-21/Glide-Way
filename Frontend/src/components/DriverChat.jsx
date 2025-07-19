import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { FaPaperPlane } from 'react-icons/fa';

const DriverChat = ({ bookingId, userId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const [socket, setSocket] = useState(null);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token missing');

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chat/messages/${bookingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Fetched messages for DriverChat:', response.data);
      const fetched = response.data || [];
      const normalized = fetched
        .filter(msg => msg.content?.trim())
        .map(msg => ({
          _id: msg._id,
          bookingId: msg.bookingId,
          senderId: {
            _id: typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id || 'unknown',
            name: msg.senderId?.name || (msg.senderModel === 'User' ? 'Passenger' : 'Driver'),
          },
          senderModel: msg.senderModel || 'User',
          message: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString(),
        }));

      setMessages(normalized);
      setLoading(false);
      socket?.emit('messageRead', { bookingId, userId });
    } catch (error) {
      console.error('Fetch failed in DriverChat:', error.message);
      setError(`Failed to load messages: ${error.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!bookingId || !userId) {
      setError('Invalid chat setup');
      setLoading(false);
      return;
    }

    const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected in DriverChat:', newSocket.id);
      newSocket.emit('joinRoom', { bookingId });
      fetchMessages();
    });

    const handleIncoming = (msg) => {
      console.log('Incoming message in DriverChat:', msg);
      if (!msg.message?.trim()) {
        console.warn('Incoming message content is empty, ignoring:', msg);
        return;
      }

      const senderIdString = msg.senderId?._id || msg.senderId;
      const isSelf = String(senderIdString) === String(userId);

      setMessages(prev => {
        let updated = [...prev];
        const incomingId = String(msg._id);

        if (msg.clientTempId && isSelf) {
          let replaced = false;
          updated = prev.map(m => {
            if (String(m._id) === String(msg.clientTempId)) {
              replaced = true;
              return {
                ...msg,
                _id: incomingId,
                senderId: {
                  _id: senderIdString,
                  name: 'You',
                },
                message: msg.message,
              };
            }
            return m;
          });
          if (!replaced && !updated.some(m => String(m._id) === incomingId)) {
            updated.push({
              ...msg,
              _id: incomingId,
              senderId: {
                _id: senderIdString,
                name: 'You',
              },
              message: msg.message,
            });
          }
        } else {
          if (!updated.some(m => String(m._id) === incomingId)) {
            updated.push({
              ...msg,
              _id: incomingId,
              senderId: {
                _id: senderIdString,
                name: msg.senderId?.name || (msg.senderModel === 'Driver' ? 'Driver' : 'Passenger'),
              },
              message: msg.message,
            });
          }
        }

        updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return updated;
      });
      newSocket.emit('messageRead', { bookingId, userId });
    };

    newSocket.on('receiveMessage', handleIncoming);
    newSocket.on('messageBroadcast', handleIncoming);
    newSocket.on('error', (errorData) => {
      console.error('Socket error in DriverChat:', errorData);
      setError(errorData.message || 'Failed to send message');
    });
    newSocket.on('connect_error', (error) => {
      console.error('Socket connect_error in DriverChat:', error);
    });
    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected in DriverChat:', reason);
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });
    newSocket.io.on('close', (reason, description) => {
      console.log('Socket.IO underlying connection closed in DriverChat:', reason, description);
    });

    return () => {
      newSocket.emit('leaveRoom', { bookingId });
      newSocket.off('receiveMessage', handleIncoming);
      newSocket.off('messageBroadcast', handleIncoming);
      newSocket.off('error');
      newSocket.off('connect_error');
      newSocket.off('disconnect');
      newSocket.io.off('close');
      newSocket.disconnect();
    };
  }, [bookingId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const clientTempId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const messageData = {
      bookingId,
      senderId: userId,
      senderModel: 'Driver',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      clientTempId,
    };

    socket?.emit('sendMessage', messageData);

    const outgoing = {
      ...messageData,
      _id: clientTempId,
      senderId: { _id: userId, name: 'You' },
      message: newMessage.trim(),
    };

    setMessages(prev => [...prev, outgoing]);
    setNewMessage('');
  };

  if (loading) return <div className="text-center py-4 text-neutral-600">Loading messages...</div>;
  if (error) return <div className="text-center py-4 text-red-600">{error}</div>;

  return (
    <div className="w-full bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-50 mb-4">
        Driver Chat for Booking {bookingId}
      </h3>
      <div className="h-80 overflow-y-auto bg-neutral-100 dark:bg-neutral-900 rounded-md p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-neutral-600 dark:text-neutral-400">No messages yet. Wait for passenger messages.</p>
        ) :
          (
            messages.map((msg) => {
              const senderIdString = msg.senderId?._id || msg.senderId;
              const isSelf =
                String(senderIdString) === String(userId) || msg.senderModel === 'Driver';


              return (
                <div key={msg._id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-lg ${isSelf
                      ? 'bg-violet-600 text-white'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100'
                      }`}
                  >
                    <p className="break-words">{msg.message}</p>
                    <p className="text-xs mt-1 opacity-70 text-right">
                      {!isSelf && (
                        <span className="mr-1">
                          {msg.senderId?.name || 'Passenger'}
                        </span>
                      )}
                      {new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-2">
        <input
          type="text"
          placeholder="Reply to passenger..."
          className="w-full appearance-none text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 bg-neutral-200/60 dark:bg-neutral-900/60 px-3 h-12 border border-neutral-200 dark:border-neutral-900 rounded-md focus:outline-none focus:bg-neutral-100 dark:focus:bg-neutral-900"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button
          type="submit"
          className="bg-violet-600 h-12 px-4 rounded-md text-neutral-50 flex items-center justify-center hover:bg-violet-700"
          disabled={!newMessage.trim()}
        >
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
};

export default DriverChat;