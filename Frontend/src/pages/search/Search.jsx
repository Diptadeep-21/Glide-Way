import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Search = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    date: '',
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.from || !formData.to || !formData.date) {
      setError('Please fill in all fields.');
      return;
    }

    if (formData.from.trim().toLowerCase() === formData.to.trim().toLowerCase()) {
      setError('Source and destination cannot be the same.');
      return;
    }

    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setError('Travel date cannot be in the past.');
      return;
    }

    try {
      const busResponse = await axios.get(`https://glide-way-backend.onrender.com/api/bus/search`, {
        params: {
          from: formData.from.trim(),
          to: formData.to.trim(),
          date: formData.date,
        },
      });

      console.log('Backend response:', busResponse.data); // Debug log

      let buses = busResponse.data.buses;

      if (!buses || buses.length === 0) {
        setError('No buses found for the specified route and date.');
        return;
      }

      const bookingPromises = buses.map(async (bus) => {
        try {
          const bookingResponse = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL}/api/bookings/bus/${bus._id}`
          );
          const bookings = bookingResponse.data.filter(
            (booking) =>
              booking.status === 'confirmed' &&
              new Date(booking.travelDate).toISOString().split('T')[0] === formData.date
          );

          const bookedSeats = bookings.flatMap((booking) => booking.seatsBooked);
          const availableSeats = bus.totalSeats - bookedSeats.length;
          return { ...bus, availableSeats };
        } catch (err) {
          console.error(`Error fetching bookings for bus ${bus._id}:`, err);
          return { ...bus, availableSeats: bus.totalSeats - (bus.bookedSeats?.length || 0) };
        }
      });

      const busesWithAvailability = await Promise.all(bookingPromises);
      const availableBuses = busesWithAvailability.filter((bus) => bus.availableSeats > 0);

      console.log('Available buses:', availableBuses); // Debug log

      if (availableBuses.length === 0) {
        setError('No buses found with available seats for the specified route and date.');
        return;
      }

      navigate('/bus', { state: { buses: availableBuses } });
    } catch (err) {
      console.error('Error searching buses:', err);
      setError('Failed to search for buses. Please try again.');
    }
  };

  return (
    <div className="w-full lg:px-28 md:px-16 sm:px-7 px-4 my-12">
      <div className="w-full bg-white dark:bg-neutral-900/80 p-8 rounded-xl card-shadow">
        <h2 className="text-2xl font-semibold mb-6 text-neutral-800 dark:text-neutral-100">Find Your Bus</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 items-end">
            <div>
              <label htmlFor="from" className="block mb-2 font-medium text-neutral-700 dark:text-neutral-300">
                From
              </label>
              <input
                type="text"
                name="from"
                id="from"
                value={formData.from}
                onChange={handleChange}
                placeholder="Enter source location"
                className="w-full text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 bg-neutral-100 dark:bg-neutral-800/60 px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>
            <div>
              <label htmlFor="to" className="block mb-2 font-medium text-neutral-700 dark:text-neutral-300">
                To
              </label>
              <input
                type="text"
                name="to"
                id="to"
                value={formData.to}
                onChange={handleChange}
                placeholder="Enter destination location"
                className="w-full text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 bg-neutral-100 dark:bg-neutral-800/60 px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>
            <div>
              <label htmlFor="date" className="block mb-2 font-medium text-neutral-700 dark:text-neutral-300">
                Travel Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 bg-neutral-100 dark:bg-neutral-800/60 px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-all duration-300"
              >
                Check Availability
              </button>
            </div>
          </div>
        </form>
        {error && <div className="text-red-500 text-sm mt-4 font-medium">{error}</div>}
      </div>
    </div>
  );
};

export default Search;