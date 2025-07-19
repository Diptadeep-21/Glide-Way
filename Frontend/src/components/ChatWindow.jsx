import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { FaPaperPlane } from 'react-icons/fa';

// Initialize socket
const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
    reconnection: true,
    reconnectionAttempts: 5,
});

const ChatWindow = ({ bookingId, userId, senderModel }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    const fetchMessages = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Authentication token missing');

            const response = await axios.get(
                `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chat/messages/${bookingId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('Fetched messages from backend:', response.data); // Debug log

            const fetched = response.data || [];
            const normalized = fetched
                .filter(msg => msg.content?.trim()) // Ensure content exists and is not empty
                .map(msg => ({
                    _id: msg._id,
                    bookingId: msg.bookingId,
                    senderId: {
                        _id: typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id || 'unknown',
                        name: msg.senderId?.name || (msg.senderModel === 'User' ? 'Passenger' : 'Driver'),
                    },
                    senderModel: msg.senderModel || 'User',
                    message: msg.content, // Map 'content' from DB to 'message' for display
                    timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString(),
                }));

            console.log('Normalized messages:', normalized); // Debug log
            setMessages(normalized);
            setLoading(false);
            socket.emit('messageRead', { bookingId, userId });
        } catch (error) {
            console.error('Fetch failed:', error.message);
            setError(`Failed to load messages: ${error.message}`);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!bookingId || !userId || !senderModel) {
            setError('Invalid chat setup');
            setLoading(false);
            return;
        }

        fetchMessages(); // Always fetch fresh from DB
        socket.emit('joinRoom', { bookingId });

        const handleIncoming = (msg) => {
            console.log('Incoming message:', msg); // Debug log
            // Ensure content exists and is not empty
            if (!msg.content?.trim()) {
                console.warn('Incoming message content is empty or undefined, ignoring:', msg);
                return;
            }

            const senderIdString = msg.senderId?._id || msg.senderId;
            const isSelf = String(senderIdString) === String(userId); // Ensure string comparison

            setMessages(prev => {
                let updated = [...prev];
                const incomingId = String(msg._id); // Ensure ID is a string

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
                                    name: msg.senderId?.name || 'You',
                                },
                                message: msg.content, // Map 'content' to 'message'
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
                                name: msg.senderId?.name || 'You',
                            },
                            message: msg.content,
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
                            message: msg.content,
                        });
                    }
                }

                updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                return updated;
            });
            socket.emit('messageRead', { bookingId, userId });
        };

        socket.on('receiveMessage', handleIncoming);
        socket.on('messageBroadcast', handleIncoming);

        return () => {
            socket.emit('leaveRoom', { bookingId });
            socket.off('receiveMessage', handleIncoming);
            socket.off('messageBroadcast', handleIncoming);
        };
    }, [bookingId, userId, senderModel]);

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
            senderModel,
            content: newMessage.trim(), // Send as 'content' to match backend schema
            timestamp: new Date().toISOString(),
            clientTempId,
        };

        socket.emit('sendMessage', messageData);

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
                Chat for Booking {bookingId}
            </h3>
            <div className="h-80 overflow-y-auto bg-neutral-100 dark:bg-neutral-900 rounded-md p-4 space-y-4">
                {messages.length === 0 ? (
                    <p className="text-neutral-600 dark:text-neutral-400">No messages yet. Start the conversation!</p>
                ) : (
                    messages.map((msg) => {
                        const senderIdString = msg.senderId?._id || msg.senderId;
                        const isSelf = String(senderIdString) === String(userId);

                        return (
                            <div key={msg._id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[70%] px-4 py-2 rounded-lg ${
                                        isSelf
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100'
                                    }`}
                                >
                                    <p className="break-words">{msg.message}</p>
                                    <p className="text-xs mt-1 opacity-70">
                                        {!isSelf && (
                                            <>
                                                {(msg.senderId?.name || (msg.senderModel === 'Driver' ? 'Driver' : 'Passenger'))}{' '}
                                            </>
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
                    placeholder="Type your message here..."
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

export default ChatWindow;