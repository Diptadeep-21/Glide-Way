import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaMedal, FaTrophy, FaStar, FaClock, FaRoad, FaMoneyBillWave } from 'react-icons/fa';

const DriverDashboard = () => {
  const [metrics, setMetrics] = useState({
    tripCompletionRate: 0,
    punctualityRate: 0,
    averageRating: null,
    earnings: 0,
  });
  const [historicalData, setHistoricalData] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDriverPerformance = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        const response = await axios.get('http://localhost:5000/api/users/driver/performance', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setMetrics(response.data.metrics);
        setHistoricalData(response.data.historicalData);
        setBadges(response.data.badges);
      } catch (err) {
        console.error('Error fetching driver performance:', err.message);
        setError('Failed to load performance data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDriverPerformance();
  }, []);

  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-600">{error}</div>;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-md p-6 space-y-6 mt-10 mx-4 sm:mx-6 md:mx-12 lg:mx-24">
      {/* Header */}
      <h1 className="text-2xl font-bold text-violet-600 dark:text-violet-400">
        Driver Performance Dashboard
      </h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Trip Completion Rate */}
        <div className="flex items-center p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
          <FaRoad className="text-3xl text-violet-600 mr-4" />
          <div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Trip Completion Rate</p>
            <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              {metrics.tripCompletionRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Punctuality Rate */}
        <div className="flex items-center p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
          <FaClock className="text-3xl text-violet-600 mr-4" />
          <div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Punctuality Rate</p>
            <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              {metrics.punctualityRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Average Rating */}
        <div className="flex items-center p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
          <FaStar className="text-3xl text-violet-600 mr-4" />
          <div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Average Rating</p>
            <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              {metrics.averageRating ? metrics.averageRating.toFixed(1) : 'N/A'} / 5
            </p>
          </div>
        </div>

        {/* Earnings */}
        <div className="flex items-center p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
          <FaMoneyBillWave className="text-3xl text-violet-600 mr-4" />
          <div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Total Earnings</p>
            <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              ₹{metrics.earnings.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Historical Performance Chart */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
          Performance Over Time
        </h2>
        {historicalData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                <XAxis
                  dataKey="month"
                  stroke="#888"
                  tick={{ fill: '#888' }}
                  label={{ value: 'Month', position: 'insideBottom', offset: -5, fill: '#888' }}
                />
                <YAxis
                  stroke="#888"
                  tick={{ fill: '#888' }}
                  label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft', fill: '#888' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    color: '#333',
                  }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line
                  type="monotone"
                  dataKey="tripCompletionRate"
                  name="Trip Completion Rate"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="punctualityRate"
                  name="Punctuality Rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-neutral-600 dark:text-neutral-400">
            No historical data available.
          </p>
        )}
      </div>

      {/* Badges Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
          Achievements
        </h2>
        {badges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge, index) => (
              <div
                key={index}
                className="flex items-center p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg"
              >
                {badge.name.toLowerCase().includes('excellence') ? (
                  <FaTrophy className="text-3xl text-yellow-500 mr-4" />
                ) : (
                  <FaMedal className="text-3xl text-yellow-500 mr-4" />
                )}
                <div>
                  <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                    {badge.name}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    {badge.description}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Earned on {new Date(badge.earnedAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-neutral-600 dark:text-neutral-400">
            No badges earned yet. Keep up the good work!
          </p>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;