import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const DashboardPassenger = () => {
  const navigate = useNavigate(); // Initialize navigate

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 p-6 rounded shadow-md max-w-3xl w-full text-center">
        <h1 className="text-2xl font-bold text-violet-600 mb-4">Welcome, Passenger!</h1>
        <p className="text-neutral-600 dark:text-neutral-300 mb-4">
          Here you can book tickets, view your bookings, and manage your account.
        </p>
        <div className="space-x-4">
          <button
            onClick={() => navigate('/bus')} // Adjust to your booking route
            className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition"
          >
            Book a Ticket
          </button>
          <button
            onClick={() => navigate('/dashboard-passenger/bookings')} // Navigate to MyBookings
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            View Bookings
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPassenger;