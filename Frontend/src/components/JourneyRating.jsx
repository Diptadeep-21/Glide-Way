import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaStar } from 'react-icons/fa';
import { motion } from 'framer-motion';

const JourneyRating = ({ bookingId, userId, bookingStatus, onRatingSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [existingRating, setExistingRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchRating = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication token missing');

        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/ratings/${bookingId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setExistingRating(response.data);
        setRating(response.data.rating);
        setComment(response.data.comment || '');
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Error fetching rating:', error.message);
          setError('Failed to load rating');
        }
      } finally {
        setLoading(false);
      }
    };

    if (bookingStatus === 'completed') {
      fetchRating();
    } else {
      setLoading(false);
    }
  }, [bookingId, bookingStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5 stars');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token missing');

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/ratings`,
        { bookingId, rating, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Rating submitted successfully!');
      setError(null);
      setExistingRating(response.data.rating);
      if (onRatingSubmitted) onRatingSubmitted();
    } catch (error) {
      console.error('Error submitting rating:', error.message);
      setError(error.response?.data?.message || 'Failed to submit rating');
      setSuccess(null);
    }
  };

  if (loading) {
    return <div className="text-center py-2 text-neutral-600">Loading...</div>;
  }

  if (bookingStatus !== 'completed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center py-2 text-neutral-600"
      >
        Journey must be completed to submit a rating.
      </motion.div>
    );
  }

  if (existingRating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md"
      >
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-white mb-2">
          Your Journey Rating
        </h3>
        <div className="flex items-center mb-2">
          {[...Array(5)].map((_, i) => (
            <FaStar
              key={i}
              className={`text-xl ${
                i + 1 <= existingRating.rating
                  ? 'text-yellow-400'
                  : 'text-neutral-300 dark:text-neutral-600'
              }`}
            />
          ))}
        </div>
        {existingRating.comment && (
          <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">
            “{existingRating.comment}”
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md space-y-4"
    >
      <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
        Rate Your Journey
      </h3>
      {error && (
        <div className="bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-200 p-3 rounded-md text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200 p-3 rounded-md text-sm">
          {success}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <FaStar
              key={star}
              className={`cursor-pointer text-2xl transition-colors ${
                star <= (hover || rating)
                  ? 'text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
            />
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write your experience (optional)"
          maxLength={500}
          className="w-full p-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200"
          rows={3}
        />
        <button
          type="submit"
          disabled={rating < 1}
          className={`w-full px-4 py-2 rounded-lg text-white font-semibold ${
            rating < 1
              ? 'bg-violet-400 cursor-not-allowed'
              : 'bg-violet-600 hover:bg-violet-700'
          }`}
        >
          Submit Rating
        </button>
      </form>
    </motion.div>
  );
};

export default JourneyRating;
