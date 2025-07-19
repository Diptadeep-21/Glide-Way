import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import GroupChat from '../components/GroupChat';

const GroupChatLink = () => {
  const { bookingId, email } = useParams();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState([]);
  const [error, setError] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    const verifyAndFetch = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/bookings/${bookingId}/group-member/${encodeURIComponent(email)}`);
        if (res.data.allowed) {
          setAllowed(true);
          const publicRes = await axios.get(`${API_BASE}/api/bookings/${bookingId}/public-group-passengers`);
          setPassengers(
            publicRes.data.passengers.map(p => ({
              ...p,
              name: p.email === email ? res.data.name : p.name,
            }))
          );
        } else {
          setError('You are not authorized to join this chat.');
        }
      } catch (err) {
        console.error('Verification failed:', err);
        setError(err.response?.data?.error || 'Access denied');
      } finally {
        setLoading(false);
      }
    };

    verifyAndFetch();
  }, [bookingId, email]);

  if (loading) return <div className="text-center py-6">Loading chat...</div>;
  if (error) return <div className="text-center text-red-600">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto mt-12 px-4">
      <h2 className="text-xl font-semibold text-violet-600 mb-4">Group Chat for Booking</h2>
      <GroupChat
        busId={null}
        bookingId={bookingId}
        userId={null}
        userEmail={email}
        passengers={passengers}
      />
    </div>
  );
};

export default GroupChatLink;