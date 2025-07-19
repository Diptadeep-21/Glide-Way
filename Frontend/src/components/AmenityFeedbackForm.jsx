import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import axios from 'axios';
import { motion } from 'framer-motion';

const AmenityFeedbackForm = ({ bookingId, onSubmit }) => {
  const [ratings, setRatings] = useState({
    wifi: { rating: 0, comment: '' },
    cleanliness: { rating: 0, comment: '' },
    seats: { rating: 0, comment: '' },
    charging: { rating: 0, comment: '' },
    other: { rating: 0, comment: '' },
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRatingChange = (amenity, value) => {
    setRatings(prev => ({
      ...prev,
      [amenity]: { ...prev[amenity], rating: value },
    }));
  };

  const handleCommentChange = (amenity, value) => {
    setRatings(prev => ({
      ...prev,
      [amenity]: { ...prev[amenity], comment: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Validate bookingId
    if (!bookingId || !/^[0-9a-f]{24}$/.test(bookingId)) {
      setError('Invalid booking ID.');
      setSubmitting(false);
      return;
    }

    // Validate token
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to submit feedback.');
      setSubmitting(false);
      return;
    }

    const amenityRatings = Object.entries(ratings)
      .filter(([_, { rating }]) => rating > 0)
      .map(([amenity, { rating, comment }]) => ({
        amenity,
        rating,
        comment: comment.trim() || undefined,
      }));

    if (amenityRatings.length === 0) {
      setError('Please rate at least one amenity.');
      setSubmitting(false);
      return;
    }

    console.log('Submitting feedback:', { bookingId, amenityRatings, token: token.slice(0, 10) + '...' });

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/amenities/feedback/${bookingId}`,
        { amenityRatings },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Feedback response:', response.data);
      setSuccess(true);
      onSubmit(amenityRatings); // Pass amenityRatings to MyBookings
      setSubmitting(false);

      // Reset form after successful submission
      setTimeout(() => {
        setRatings({
          wifi: { rating: 0, comment: '' },
          cleanliness: { rating: 0, comment: '' },
          seats: { rating: 0, comment: '' },
          charging: { rating: 0, comment: '' },
          other: { rating: 0, comment: '' },
        });
      }, 1000);
    } catch (err) {
      console.error('Feedback error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        config: {
          url: err.config?.url,
          headers: err.config?.headers,
          data: err.config?.data,
        },
      });
      setError(
        err.response?.data?.error ||
        err.message ||
        'Failed to submit feedback. Please try again.'
      );
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md space-y-4"
    >
      <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
        Rate Bus Amenities
      </h3>
      {error && (
        <div className="bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-200 p-3 rounded-md text-sm">
          {error}
        </div>
      )}
      {success ? (
        <div className="bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200 p-3 rounded-md text-sm">
          Thank you for your feedback!
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {['wifi', 'cleanliness', 'seats', 'charging', 'other'].map(amenity => (
            <div key={amenity} className="space-y-2">
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 capitalize">
                {amenity}
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <FaStar
                    key={star}
                    className={`cursor-pointer text-2xl ${
                      star <= ratings[amenity].rating
                        ? 'text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                    onClick={() => handleRatingChange(amenity, star)}
                  />
                ))}
              </div>
              <textarea
                value={ratings[amenity].comment}
                onChange={e => handleCommentChange(amenity, e.target.value)}
                placeholder={`Comment on ${amenity} (optional)`}
                className="w-full p-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200"
                maxLength={500}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full px-4 py-2 rounded-lg text-white font-semibold ${
              submitting
                ? 'bg-violet-400 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      )}
    </motion.div>
  );
};

export default AmenityFeedbackForm;