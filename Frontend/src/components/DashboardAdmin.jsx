import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Chart from 'chart.js/auto';
import { format } from 'date-fns';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import Papa from 'papaparse';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom icon for active buses
const activeBusIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to manage map state persistence
const MapStateManager = ({ setMapState }) => {
  const map = useMap();

  useEffect(() => {
    const savedState = localStorage.getItem('mapState');
    if (savedState) {
      const { center, zoom } = JSON.parse(savedState);
      map.setView(center, zoom);
    }
  }, [map]);

  useEffect(() => {
    const handleMoveEnd = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const mapState = { center: [center.lat, center.lng], zoom };
      localStorage.setItem('mapState', JSON.stringify(mapState));
      setMapState(mapState);
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map, setMapState]);

  return null;
};

const DashboardAdmin = () => {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [bookingTrends, setBookingTrends] = useState([]);
  const [dailyBookingTrends, setDailyBookingTrends] = useState([]);
  const [revenueTrends, setRevenueTrends] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busFilter, setBusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [maintenanceModal, setMaintenanceModal] = useState(null);
  const socketRef = useRef(null);
  const hourlyChartRef = useRef(null);
  const dailyChartRef = useRef(null);
  const revenueChartRef = useRef(null);
  const hourlyCanvasRef = useRef(null);
  const dailyCanvasRef = useRef(null);
  const revenueCanvasRef = useRef(null);
  const [revenueToday, setRevenueToday] = useState(0);
  const [revenueError, setRevenueError] = useState(null);
  const [mapState, setMapState] = useState(() => {
    const savedState = localStorage.getItem('mapState');
    return savedState ? JSON.parse(savedState) : { center: [20.5937, 78.9629], zoom: 5 };
  });
  const [amenityAnalytics, setAmenityAnalytics] = useState({
    averageRatings: {},
    trendData: [],
    loading: true,
    error: null,
  });
  const [busTypeDistribution, setBusTypeDistribution] = useState([]);
  const [bookingStatusBreakdown, setBookingStatusBreakdown] = useState([]);
  const [amenityDetailsModal, setAmenityDetailsModal] = useState(null);
  const amenityChartRef = useRef(null);
  const amenityCanvasRef = useRef(null);
  const busTypeChartRef = useRef(null);
  const busTypeCanvasRef = useRef(null);
  const bookingStatusChartRef = useRef(null);
  const bookingStatusCanvasRef = useRef(null);

  // Fetch data and initialize Socket.IO
  useEffect(() => {
    const connectSocket = () => {
      if (socketRef.current?.connected) return;
      socketRef.current = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        query: { role: 'admin' },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on('connect', () => console.log('Socket.IO connected:', socketRef.current.id));
      socketRef.current.on('connect_error', (err) => {
        console.error('Socket.IO connection error:', err.message);
        setError('Failed to connect to real-time updates.');
      });

      socketRef.current.on('locationUpdate', ({ busId, latitude, longitude, timestamp }) => {
        setBuses(prev => prev.map(bus => bus._id === busId ? { ...bus, currentLocation: { latitude, longitude, timestamp: new Date(timestamp) } } : bus));
      });

      socketRef.current.on('trackingStatusUpdate', ({ busId, isTrackingEnabled }) => {
        setBuses(prev => prev.map(bus => bus._id === busId ? { ...bus, isTrackingEnabled } : bus));
      });

      socketRef.current.on('busAlert', ({ busId, message, severity }) => {
        toast[severity === 'high' ? 'error' : 'warning'](`Bus ${busId}: ${message}`);
        setAlerts(prev => [...prev, { busId, message, severity, timestamp: new Date() }].slice(-5));
      });
    };

    const timer = setTimeout(connectSocket, 1000);

    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view dashboard.');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);

        // Fetch buses
        const busesResponse = await axios.get('https://glide-way-backend.onrender.com/api/bus/all', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        setBuses(Array.isArray(busesResponse.data.buses) ? busesResponse.data.buses : []);

        // Fetch booking trends
        const bookingTrendsResponse = await axios.get('https://glide-way-backend.onrender.com/api/bookings/trends', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        setBookingTrends(Array.isArray(bookingTrendsResponse.data.trends) ? bookingTrendsResponse.data.trends : []);

        // Fetch daily booking trends
        const dailyBookingTrendsResponse = await axios.get('https://glide-way-backend.onrender.com/api/bookings/daily-trends', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        setDailyBookingTrends(
          Array.isArray(dailyBookingTrendsResponse.data.trends) ? dailyBookingTrendsResponse.data.trends : []
        );

        // Fetch revenue trends
        const revenueTrendsResponse = await axios.get('https://glide-way-backend.onrender.com/api/bookings/revenue-trends', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        setRevenueTrends(Array.isArray(revenueTrendsResponse.data.trends) ? revenueTrendsResponse.data.trends : []);

        // Fetch drivers
        const driversResponse = await axios.get('https://glide-way-backend.onrender.com/api/users/drivers', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        setDrivers(Array.isArray(driversResponse.data.drivers) ? driversResponse.data.drivers : []);

        // Fetch amenity analytics
        const amenityResponse = await axios.get('https://glide-way-backend.onrender.com/api/amenities/amenity-analytics', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        console.log('Raw Amenity Analytics Response:', amenityResponse.data);
        setAmenityAnalytics({
          averageRatings: amenityResponse.data.averageRatings || {},
          trendData: Array.isArray(amenityResponse.data.trendData) ? amenityResponse.data.trendData : [],
          loading: false,
          error: null,
        });

        // Fetch bus type distribution
        const busTypeResponse = await axios.get('https://glide-way-backend.onrender.com/api/bus/type-distribution', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        setBusTypeDistribution(
          Array.isArray(busTypeResponse.data.distribution) ? busTypeResponse.data.distribution : []
        );

        // Fetch booking status breakdown
        const bookingStatusResponse = await axios.get('https://glide-way-backend.onrender.com/api/bookings/status-breakdown', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        setBookingStatusBreakdown(
          Array.isArray(bookingStatusResponse.data.breakdown) ? bookingStatusResponse.data.breakdown : []
        );

        // Fetch today's revenue
        await fetchTodaysRevenue();
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response) {
          console.error('Server error details:', err.response.data);
        }
        setError(`Failed to load data: ${err.response?.data?.message || err.message}`);
        setAmenityAnalytics(prev => ({ ...prev, loading: false, error: 'Failed to load amenity analytics' }));
      } finally {
        setIsLoading(false);
      }
    };

    const fetchTodaysRevenue = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
        const response = await axios.get('https://glide-way-backend.onrender.com/api/bookings/today-revenue', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        const revenue = Number(response.data.revenue) || 0;
        console.log('Fetched today\'s revenue:', revenue);
        setRevenueToday(revenue);
        setRevenueError(null);
      } catch (err) {
        console.error('Error fetching today\'s revenue:', err.message);
        setRevenueError('Failed to fetch today\'s revenue');
        setRevenueToday(0);
        toast.error('Failed to load today\'s revenue');
      }
    };

    fetchData();

    // Refresh revenue every 5 minutes
    const revenueInterval = setInterval(fetchTodaysRevenue, 5 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      if (socketRef.current) socketRef.current.disconnect();
      clearInterval(revenueInterval);
    };
  }, []);

  // Initialize Charts
  useEffect(() => {
    if (isLoading || amenityAnalytics.loading) return;

    // Initialize Hourly Chart
    console.log('Hourly Booking Trends:', bookingTrends);
    if (bookingTrends.length > 0 && hourlyCanvasRef.current) {
      console.log('Initializing Hourly Chart');
      if (hourlyChartRef.current) hourlyChartRef.current.destroy();
      const ctx = hourlyCanvasRef.current.getContext('2d');
      hourlyChartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: bookingTrends.map(item => {
            const date = new Date(item.hour);
            date.setMinutes(date.getMinutes() + 330);
            return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
          }),
          datasets: [{
            label: 'Bookings (Last 24h, IST)',
            data: bookingTrends.map(item => item.count),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } },
        },
      });
    } else {
      console.log('Skipping Hourly Chart: Empty trends or no canvas');
    }

    // Initialize Daily Chart
    console.log('Daily Booking Trends:', dailyBookingTrends);
    if (dailyBookingTrends.length > 0 && dailyCanvasRef.current) {
      console.log('Initializing Daily Chart');
      if (dailyChartRef.current) dailyChartRef.current.destroy();
      const ctx = dailyCanvasRef.current.getContext('2d');
      dailyChartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dailyBookingTrends.map(item => item.day),
          datasets: [{
            label: 'Daily Bookings (30 days)',
            data: dailyBookingTrends.map(item => item.count),
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } },
        },
      });
    } else {
      console.log('Skipping Daily Chart: Empty trends or no canvas');
    }

    // Initialize Revenue Chart
    console.log('Revenue Trends:', revenueTrends);
    if (revenueTrends.length > 0 && revenueCanvasRef.current) {
      console.log('Initializing Revenue Chart');
      if (revenueChartRef.current) revenueChartRef.current.destroy();
      const ctx = revenueCanvasRef.current.getContext('2d');
      revenueChartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: revenueTrends.map(item => item.day),
          datasets: [{
            label: 'Daily Revenue (30 days)',
            data: revenueTrends.map(item => item.revenue),
            borderColor: 'rgba(255, 99, 132, 1)',
            fill: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } },
        },
      });
    } else {
      console.log('Skipping Revenue Chart: Empty trends or no canvas');
    }

    // Initialize Amenity Chart
    console.log('Amenity Analytics Data:', amenityAnalytics);
    if (
      !amenityAnalytics.loading &&
      Object.keys(amenityAnalytics.averageRatings).length > 0 &&
      amenityCanvasRef.current
    ) {
      console.log('Initializing Amenity Chart with data:', amenityAnalytics.averageRatings);
      if (amenityChartRef.current) amenityChartRef.current.destroy();
      const ctx = amenityCanvasRef.current.getContext('2d');
      amenityChartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['WiFi', 'Cleanliness', 'Seats', 'Charging', 'Other'],
          datasets: [
            {
              label: 'Average Ratings (1-5)',
              data: [
                parseFloat(amenityAnalytics.averageRatings.wifi) || 0,
                parseFloat(amenityAnalytics.averageRatings.cleanliness) || 0,
                parseFloat(amenityAnalytics.averageRatings.seats) || 0,
                parseFloat(amenityAnalytics.averageRatings.charging) || 0,
                parseFloat(amenityAnalytics.averageRatings.other) || 0,
              ],
              backgroundColor: 'rgba(153, 102, 255, 0.6)',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, max: 5 },
          },
        },
      });
    } else {
      console.log(
        'Skipping Amenity Chart: ',
        amenityAnalytics.loading ? 'Loading' : '',
        Object.keys(amenityAnalytics.averageRatings).length === 0 ? 'Empty ratings' : '',
        !amenityCanvasRef.current ? 'No canvas' : ''
      );
    }

    // Initialize Bus Type Distribution Chart
    console.log('Bus Type Distribution:', busTypeDistribution);
    if (busTypeDistribution.length > 0 && busTypeCanvasRef.current) {
      console.log('Initializing Bus Type Chart');
      if (busTypeChartRef.current) busTypeChartRef.current.destroy();
      const ctx = busTypeCanvasRef.current.getContext('2d');
      busTypeChartRef.current = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: busTypeDistribution.map(item => item._id),
          datasets: [{
            label: 'Bus Type Distribution',
            data: busTypeDistribution.map(item => item.count),
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)',
            ],
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
          },
        },
      });
    } else {
      console.log('Skipping Bus Type Chart: Empty data or no canvas');
    }

    // Initialize Booking Status Breakdown Chart
    console.log('Booking Status Breakdown:', bookingStatusBreakdown);
    if (bookingStatusBreakdown.length > 0 && bookingStatusCanvasRef.current) {
      console.log('Initializing Booking Status Chart');
      if (bookingStatusChartRef.current) bookingStatusChartRef.current.destroy();
      const ctx = bookingStatusCanvasRef.current.getContext('2d');
      bookingStatusChartRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: bookingStatusBreakdown.map(item => item._id),
          datasets: [{
            label: 'Booking Status Breakdown',
            data: bookingStatusBreakdown.map(item => item.count),
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(255, 99, 132, 0.6)',
            ],
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
          },
        },
      });
    } else {
      console.log('Skipping Booking Status Chart: Empty data or no canvas');
    }

    return () => {
      if (hourlyChartRef.current) hourlyChartRef.current.destroy();
      if (dailyChartRef.current) dailyChartRef.current.destroy();
      if (revenueChartRef.current) revenueChartRef.current.destroy();
      if (amenityChartRef.current) amenityChartRef.current.destroy();
      if (busTypeChartRef.current) busTypeChartRef.current.destroy();
      if (bookingStatusChartRef.current) bookingStatusChartRef.current.destroy();
    };
  }, [isLoading, bookingTrends, dailyBookingTrends, revenueTrends, amenityAnalytics, busTypeDistribution, bookingStatusBreakdown]);

  const handleBusClick = async bus => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`https://glide-way-backend.onrender.com/api/bus/${bus._id}`, {
        headers,
        timeout: 10000,
      });
      console.log('Fetched bus details:', response.data.bus);
      setSelectedBus({ ...response.data.bus, eta: calculateETA(response.data.bus) });
      setError(null);
    } catch (err) {
      console.error('Error fetching bus details:', err);
      toast.error(`Failed to load bus details: ${err.response?.data?.message || err.message}`);
      setSelectedBus(null);
    }
  };

  const calculateETA = bus => {
    if (!bus.destinationTime) return 'N/A';
    const eta = new Date(bus.destinationTime);
    const now = new Date();
    if (eta < now) return 'Arrived';
    const diffMs = eta - now;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleMaintenanceClick = async busId => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`https://glide-way-backend.onrender.com/api/bus/${busId}/maintenance`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      console.log(`Maintenance data for bus ${busId}:`, response.data);
      setMaintenanceModal({
        busId,
        maintenance: Array.isArray(response.data.maintenance) ? response.data.maintenance : [],
        error: null,
      });
    } catch (err) {
      console.error('Error fetching maintenance data:', err);
      toast.error(`Failed to load maintenance data: ${err.response?.data?.message || err.message}`);
      setMaintenanceModal({
        busId,
        maintenance: [],
        error: `Failed to load maintenance data: ${err.response?.data?.message || err.message}`,
      });
    }
  };

  const scheduleMaintenance = async (busId, date, type) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`https://glide-way-backend.onrender.com/api/bus/${busId}/maintenance`, { date, type }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 5000,
      });
      toast.success('Maintenance scheduled successfully');
      setMaintenanceModal(null);
      const busesResponse = await axios.get('https://glide-way-backend.onrender.com/api/bus/all', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      setBuses(Array.isArray(busesResponse.data.buses) ? busesResponse.data.buses : []);
    } catch (err) {
      console.error('Error scheduling maintenance:', err);
      toast.error(`Failed to schedule maintenance: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleAmenityDetailsClick = async busId => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`https://glide-way-backend.onrender.com/api/amenities/ratings/bus/${busId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      console.log(`Amenity details for bus ${busId}:`, response.data);
      setAmenityDetailsModal({
        busId,
        ratings: Array.isArray(response.data.ratings) ? response.data.ratings : [],
        averageRatings: response.data.averageRatings || {},
        error: null,
      });
    } catch (err) {
      console.error('Error fetching amenity details:', err);
      toast.error(`Failed to load amenity details: ${err.response?.data?.message || err.message}`);
      setAmenityDetailsModal({
        busId,
        ratings: [],
        averageRatings: {},
        error: `Failed to load amenity details: ${err.response?.data?.message || err.message}`,
      });
    }
  };

  const exportData = (type) => {
    let data = [];
    if (type === 'buses') {
      data = buses.map(bus => ({
        ID: bus._id,
        Name: bus.busName,
        Number: bus.busNumber,
        Route: `${bus.source} to ${bus.destination}`,
        Tracking: bus.isTrackingEnabled ? 'Enabled' : 'Disabled',
        LastLocation: bus.currentLocation ? `${bus.currentLocation.latitude}, ${bus.currentLocation.longitude}` : 'N/A',
        BusType: bus.busType,
      }));
    } else if (type === 'bookings' && selectedBus) {
      data = selectedBus.bookings.map(booking => ({
        ID: booking._id,
        Bus: selectedBus.busName,
        Seats: booking.seatsBooked.join(', '),
        Passenger: booking.passengerName || 'N/A',
        Date: format(new Date(booking.createdAt), 'PP'),
        Status: booking.status,
      }));
    } else if (type === 'amenityRatings' && amenityDetailsModal) {
      data = amenityDetailsModal.ratings.map(rating => ({
        Amenity: rating.amenity,
        Rating: rating.rating,
        Comment: rating.comment,
        User: rating.user,
        Date: rating.date && !isNaN(new Date(rating.date).getTime()) 
          ? format(new Date(rating.date), 'PP') 
          : 'Invalid Date',
      }));
    }

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${type}-${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredBuses = buses.filter(bus => {
    if (busFilter === 'Active') return bus.isTrackingEnabled;
    if (busFilter === 'Inactive') return !bus.isTrackingEnabled;
    if (busFilter === 'Delayed') return calculateETA(bus) !== 'Arrived' && calculateETA(bus) !== 'N/A';
    return true;
  }).filter(bus => bus.busName.toLowerCase().includes(searchQuery.toLowerCase()) || bus.busNumber.toLowerCase().includes(searchQuery.toLowerCase()));

  const metrics = {
    totalBuses: buses.length,
    activeBuses: buses.filter(bus => bus.isTrackingEnabled).length,
    totalBookings: bookingTrends.reduce((sum, trend) => sum + (trend.count || 0), 0),
    revenueToday,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-violet-50 to-white dark:from-neutral-900 dark:to-neutral-800 p-4 sm:p-6"
    >
      <Toaster position="top-right" />
      <h1 className="text-3xl sm:text-4xl font-bold text-violet-600 dark:text-violet-400 mb-6 text-center">
        Admin Analytics Dashboard
      </h1>
      {error && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg text-center"
        >
          {error}
        </motion.div>
      )}
      {isLoading && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-4 p-4 bg-blue-100 text-blue-700 rounded-lg text-center"
        >
          Loading data...
        </motion.div>
      )}

      {/* Key Metrics */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {[
          { label: 'Total Buses', value: metrics.totalBuses, icon: '\uD83D\uDE8C' },
          { label: 'Active Buses', value: metrics.activeBuses, icon: '\uD83D\uDCE6' },
          { label: 'Total Bookings', value: metrics.totalBookings, icon: '\uD83C\uDFAF' },
          { label: 'Revenue Today', value: revenueToday === null ? 'Loading...' : `₹${revenueToday.toLocaleString('en-IN')}`, icon: '\uD83D\uDCB0' },
        ].map((metric, idx) => (
          <div key={idx} className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{metric.icon}</span>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">{metric.label}</p>
                <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{metric.value}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Map */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md lg:col-span-2 z-10"
        >
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Live Bus Locations</h2>
          <div className="h-[350px] w-full rounded">
            {isLoading ? (
              <div className="animate-pulse bg-gray-200 h-full w-full rounded"></div>
            ) : (
              <MapContainer center={mapState.center} zoom={mapState.zoom} style={{ height: '100%', width: '100%' }}>
                <MapStateManager setMapState={setMapState} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {filteredBuses.filter(bus => bus.isTrackingEnabled && bus.currentLocation?.latitude && bus.currentLocation?.longitude).map(bus => (
                  <Marker
                    key={bus._id}
                    position={[bus.currentLocation.latitude, bus.currentLocation.longitude]}
                    icon={activeBusIcon}
                    eventHandlers={{ click: () => handleBusClick(bus) }}
                  >
                    <Popup>
                      Bus: {bus.busName}<br />
                      Last Updated: {bus.currentLocation.timestamp ? format(new Date(bus.currentLocation.timestamp), 'PPp') : 'N/A'}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
          {filteredBuses.length === 0 && !isLoading && (
            <p className="text-center text-neutral-600 dark:text-neutral-300 mt-3">No actively tracked buses available.</p>
          )}
        </motion.div>

        {/* Alerts */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md"
        >
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Real-Time Alerts</h2>
          <div className="h-[350px] overflow-y-auto">
            {alerts.length > 0 ? (
              alerts.map((alert, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-2 mb-2 rounded ${alert.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}
                >
                  <p className="text-sm">{alert.message}</p>
                  <p className="text-xs text-neutral-500">{format(new Date(alert.timestamp), 'PPp')}</p>
                </motion.div>
              ))
            ) : (
              <p className="text-center text-neutral-600 dark:text-neutral-300">No alerts at the moment.</p>
            )}
          </div>
        </motion.div>

        {/* Bus List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md lg:col-span-3"
        >
          <div className="flex flex-col sm:flex-row justify-between items-center mb-3 gap-3">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">Bus List</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search buses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="p-2 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 w-full sm:w-48"
              />
              <select
                value={busFilter}
                onChange={(e) => setBusFilter(e.target.value)}
                className="p-2 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Delayed">Delayed</option>
              </select>
              <button
                onClick={() => exportData('buses')}
                className="px-3 py-2 bg-violet-600 text-white rounded hover:bg-violet-700"
              >
                Export CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-200 h-12 rounded"></div>
                ))}
              </div>
            ) : (
              <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300">
                <thead>
                  <tr className="bg-neutral-100 dark:bg-neutral-700">
                    <th className="p-2">Name</th>
                    <th className="p-2">Number</th>
                    <th className="p-2">Route</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuses.map(bus => (
                    <tr key={bus._id} className="border-t dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                      <td className="p-2">{bus.busName}</td>
                      <td className="p-2">{bus.busNumber}</td>
                      <td className="p-2">{bus.source} to {bus.destination}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${bus.isTrackingEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {bus.isTrackingEnabled ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-2 flex gap-2">
                        <button
                          onClick={() => handleBusClick(bus)}
                          className="text-violet-600 hover:underline"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleMaintenanceClick(bus._id)}
                          className="text-green-600 hover:underline"
                        >
                          Maintenance
                        </button>
                        <button
                          onClick={() => handleAmenityDetailsClick(bus._id)}
                          className="text-blue-600 hover:underline"
                        >
                          Ratings
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {/* Charts */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md lg:col-span-1"
        >
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Booking Trends (24h)</h2>
          {isLoading ? (
            <div className="animate-pulse bg-gray-200 h-[300px] rounded"></div>
          ) : bookingTrends.length > 0 ? (
            <div className="h-[300px]">
              <canvas ref={hourlyCanvasRef} id="hourlyBookingChart" />
            </div>
          ) : (
            <p className="text-center text-neutral-600 dark:text-neutral-300">No booking trends available.</p>
          )}
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md lg:col-span-1"
        >
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Booking Trends (30d)</h2>
          {isLoading ? (
            <div className="animate-pulse bg-gray-200 h-[300px] rounded"></div>
          ) : dailyBookingTrends.length > 0 ? (
            <div className="h-[300px]">
              <canvas ref={dailyCanvasRef} id="dailyBookingChart" />
            </div>
          ) : (
            <p className="text-center text-neutral-600 dark:text-neutral-300">No daily booking trends available.</p>
          )}
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md lg:col-span-1"
        >
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Revenue Trends (30d)</h2>
          {isLoading ? (
            <div className="animate-pulse bg-gray-200 h-[300px] rounded"></div>
          ) : revenueTrends.length > 0 ? (
            <div className="h-[300px]">
              <canvas ref={revenueCanvasRef} id="revenueChart" />
            </div>
          ) : (
            <p className="text-center text-neutral-600 dark:text-neutral-300">No revenue trends available.</p>
          )}
        </motion.div>

        {/* Bus Type Distribution Chart */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md lg:col-span-1"
        >
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Bus Type Distribution</h2>
          {isLoading ? (
            <div className="animate-pulse bg-gray-200 h-[300px] rounded"></div>
          ) : busTypeDistribution.length > 0 ? (
            <div className="h-[300px]">
              <canvas ref={busTypeCanvasRef} id="busTypeChart" />
            </div>
          ) : (
            <p className="text-center text-neutral-600 dark:text-neutral-300">No bus type distribution data available.</p>
          )}
        </motion.div>

        {/* Booking Status Breakdown Chart */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md lg:col-span-1"
        >
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Booking Status Breakdown</h2>
          {isLoading ? (
            <div className="animate-pulse bg-gray-200 h-[300px] rounded"></div>
          ) : bookingStatusBreakdown.length > 0 ? (
            <div className="h-[300px]">
              <canvas ref={bookingStatusCanvasRef} id="bookingStatusChart" />
            </div>
          ) : (
            <p className="text-center text-neutral-600 dark:text-neutral-300">No booking status data available.</p>
          )}
        </motion.div>

        {/* Amenity Analytics */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md lg:col-span-1"
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">Amenity Ratings</h2>
          </div>
          {amenityAnalytics.loading ? (
            <div className="animate-pulse bg-gray-200 h-[300px] rounded"></div>
          ) : amenityAnalytics.error ? (
            <p className="text-center text-red-600 dark:text-red-400">{amenityAnalytics.error}</p>
          ) : Object.keys(amenityAnalytics.averageRatings).length > 0 ? (
            <div className="h-[300px]">
              <canvas ref={amenityCanvasRef} id="amenityChart" />
            </div>
          ) : (
            <p className="text-center text-neutral-600 dark:text-neutral-300">
              No amenity ratings available. Encourage passengers to provide feedback.
            </p>
          )}
        </motion.div>

        {/* Driver Performance */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md lg:col-span-3"
        >
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Top Drivers</h2>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-200 h-12 rounded"></div>
                ))}
              </div>
            ) : drivers.length > 0 ? (
              <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300">
                <thead>
                  <tr className="bg-neutral-100 dark:bg-neutral-700">
                    <th className="p-2">Name</th>
                    <th className="p-2">Trips Completed</th>
                    <th className="p-2">Average Rating</th>
                    <th className="p-2">Current Bus</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.slice(0, 5).map(driver => (
                    <tr key={driver._id} className="border-t dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                      <td className="p-2">{driver.name}</td>
                      <td className="p-2">{driver.tripsCompleted || 0}</td>
                      <td className="p-2">{driver.averageRating ? driver.averageRating.toFixed(1) : 'N/A'}</td>
                      <td className="p-2">{driver.currentBus?.busName || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-neutral-600 dark:text-neutral-300">No driver data available.</p>
            )}
          </div>
        </motion.div>

        {/* Bus Details Modal */}
        <AnimatePresence>
          {selectedBus && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg w-full max-w-lg"
              >
                <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-4">
                  Bus Details: {selectedBus.busName}
                </h2>
                <div className="space-y-4">
                  <div className="border-b border-neutral-200 dark:border-neutral-600 pb-3">
                    <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">General Information</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <p className="text-neutral-600 dark:text-neutral-300"><strong>Bus Number:</strong> {selectedBus.busNumber}</p>
                      <p className="text-neutral-600 dark:text-neutral-300"><strong>Route:</strong> {selectedBus.source} to {selectedBus.destination}</p>
                      <p className="text-neutral-600 dark:text-neutral-300"><strong>Driver:</strong> {selectedBus.driverId?.name || 'N/A'}</p>
                      <p className="text-neutral-600 dark:text-neutral-300"><strong>ETA:</strong> {selectedBus.eta}</p>
                      <p className="text-neutral-600 dark:text-neutral-300"><strong>Tracking:</strong> {selectedBus.isTrackingEnabled ? 'Enabled' : 'Disabled'}</p>
                      <p className="text-neutral-600 dark:text-neutral-300"><strong>Bus Type:</strong> {selectedBus.busType}</p>
                    </div>
                  </div>
                  <div className="border-b border-neutral-200 dark:border-neutral-600 pb-3">
                    <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Booking Information</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <p className="text-neutral-600 dark:text-neutral-300">
                        <strong>Passengers:</strong>
                        <span className="ml-2 px-2 py-1 bg-violet-100 dark:bg-violet-700 text-violet-800 dark:text-violet-200 rounded-full">
                          {selectedBus.bookings.length || 0}
                        </span>
                      </p>
                      <p className="text-neutral-600 dark:text-neutral-300">
                        <strong>Boarding Points:</strong> {selectedBus.boardingPoints.join(', ') || 'N/A'}
                      </p>
                      <div>
                        <p className="text-neutral-600 dark:text-neutral-300"><strong>Seats Booked:</strong></p>
                        {selectedBus.bookings.flatMap(b => b.seatsBooked).length > 0 ? (
                          <div className="mt-2 max-h-24 overflow-y-auto">
                            <div className="grid grid-cols-4 gap-2">
                              {selectedBus.bookings
                                .flatMap(b => b.seatsBooked)
                                .sort((a, b) => a - b)
                                .map(seat => (
                                  <span
                                    key={seat}
                                    className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded text-sm text-center"
                                  >
                                    {seat}
                                  </span>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-neutral-600 dark:text-neutral-300">None</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <button
                    onClick={() => exportData('bookings')}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Export Bookings
                  </button>
                  <button
                    onClick={() => handleAmenityDetailsClick(selectedBus._id)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    View Amenity Ratings
                  </button>
                  <button
                    onClick={() => setSelectedBus(null)}
                    className="w-full px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Maintenance Modal */}
        <AnimatePresence>
          {maintenanceModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg w-full max-w-md"
              >
                <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
                  Maintenance for Bus {buses.find(b => b._id === maintenanceModal.busId)?.busName || 'Unknown'}
                </h2>
                {maintenanceModal.error && (
                  <p className="text-center text-red-600 dark:text-red-400 mb-4">{maintenanceModal.error}</p>
                )}
                {maintenanceModal.maintenance.length > 0 ? (
                  <div className="mb-4 max-h-48 overflow-y-auto">
                    {maintenanceModal.maintenance.map((m, idx) => (
                      <div key={idx} className="p-2 mb-2 bg-gray-100 dark:bg-neutral-700 rounded">
                        <p><strong>Date:</strong> {new Date(m.date).toLocaleDateString('en-IN')}</p>
                        <p><strong>Type:</strong> {m.type}</p>
                        <p><strong>Status:</strong> {m.completed ? 'Completed' : 'Pending'}</p>
                        {m.notes && <p><strong>Notes:</strong> {m.notes}</p>}
                        <p><strong>Created At:</strong> {new Date(m.createdAt).toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-neutral-600 dark:text-neutral-300 mb-4">No maintenance records.</p>
                )}
                <div className="space-y-4">
                  <input
                    type="date"
                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700"
                    onChange={(e) => setMaintenanceModal(prev => ({ ...prev, newDate: e.target.value }))}
                  />
                  <select
                    className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700"
                    onChange={(e) => setMaintenanceModal(prev => ({ ...prev, newType: e.target.value }))}
                  >
                    <option value="">Select Maintenance Type</option>
                    <option value="routine">Routine Check</option>
                    <option value="repair">Repair</option>
                  </select>
                  <button
                    onClick={() => scheduleMaintenance(maintenanceModal.busId, maintenanceModal.newDate, maintenanceModal.newType)}
                    disabled={!maintenanceModal.newDate || !maintenanceModal.newType}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Schedule Maintenance
                  </button>
                  <button
                    onClick={() => setMaintenanceModal(null)}
                    className="w-full px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Amenity Details Modal */}
        <AnimatePresence>
          {amenityDetailsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg w-full max-w-2xl"
              >
                <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-4">
                  Amenity Ratings for Bus {buses.find(b => b._id === amenityDetailsModal.busId)?.busName || 'Unknown'}
                </h2>
                {amenityDetailsModal.error ? (
                  <p className="text-center text-red-600 dark:text-red-400 mb-4">{amenityDetailsModal.error}</p>
                ) : (
                  <>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Average Ratings</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(amenityDetailsModal.averageRatings).map(([amenity, data]) => (
                          <p key={amenity} className="text-neutral-600 dark:text-neutral-300">
                            <strong>{amenity.charAt(0).toUpperCase() + amenity.slice(1)}:</strong> {data.average} ({data.count} ratings)
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4 max-h-64 overflow-y-auto">
                      <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Detailed Ratings</h3>
                      {amenityDetailsModal.ratings.length > 0 ? (
                        <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300">
                          <thead>
                            <tr className="bg-neutral-100 dark:bg-neutral-700">
                              <th className="p-2">Amenity</th>
                              <th className="p-2">Rating</th>
                              <th className="p-2">Comment</th>
                              <th className="p-2">User</th>
                              <th className="p-2">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {amenityDetailsModal.ratings.map((rating, idx) => (
                              <tr key={idx} className="border-t dark:border-neutral-700">
                                <td className="p-2">{rating.amenity.charAt(0).toUpperCase() + rating.amenity.slice(1)}</td>
                                <td className="p-2">{rating.rating}</td>
                                <td className="p-2">{rating.comment}</td>
                                <td className="p-2">{rating.user}</td>
                                <td className="p-2">
                                  {rating.date && !isNaN(new Date(rating.date).getTime())
                                    ? format(new Date(rating.date), 'PP')
                                    : 'Invalid Date'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-center text-neutral-600 dark:text-neutral-300">No ratings available.</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => exportData('amenityRatings')}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Export Ratings
                      </button>
                      <button
                        onClick={() => setAmenityDetailsModal(null)}
                        className="w-full px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default DashboardAdmin;