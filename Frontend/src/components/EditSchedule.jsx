import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const EditSchedule = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    date: '',
    departureTime: '',
    arrivalTime: '',
    destinationTime: '',
    busName: '',
    busNumber: '',
    totalSeats: '',
    fare: '',
    haltingTime: '',
    boardingPoints: '',
    busType: 'AC'
  });
  const [imageFile, setImageFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBusData = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!token || user.role !== 'driver') {
          setError('Please log in as a driver to edit schedule');
          setLoading(false);
          navigate('/login');
          return;
        }

        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/bus/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const bus = response.data.bus;
        if (!bus) {
          setError('Bus not found');
          setLoading(false);
          return;
        }

        console.log('Fetched bus data:', bus); // Debug log

        const busDate = new Date(bus.date);
        const formattedDate = busDate.toISOString().split('T')[0];

        const formatTime = (isoString) => {
          if (!isoString) return '';
          const date = new Date(isoString);
          return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        };

        setFormData({
          source: bus.source || '',
          destination: bus.destination || '',
          date: formattedDate,
          departureTime: formatTime(bus.departureTime),
          arrivalTime: formatTime(bus.arrivalTime),
          destinationTime: formatTime(bus.destinationTime),
          busName: bus.busName || '',
          busNumber: bus.busNumber || '',
          totalSeats: bus.totalSeats || '',
          fare: bus.fare || '',
          haltingTime: bus.haltingTime || '',
          boardingPoints: bus.boardingPoints?.join(', ') || '',
          busType: bus.busType || 'AC',
        });
        setExistingImageUrl(bus.imageUrl || '');
        setLoading(false);
      } catch (err) {
        console.error('Error fetching bus data:', err);
        setError(err.response?.data?.error || 'Failed to load bus data');
        setLoading(false);
        if (err.response?.status === 403) {
          setError('Unauthorized to access this bus');
        } else if (err.response?.status === 404) {
          setError('Bus not found');
        }
      }
    };

    fetchBusData();
  }, [id, navigate]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalSeats' || name === 'fare' ? Number(value) : value,
    }));
  };

  const combineDateAndTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const combined = new Date(year, month - 1, day, hours, minutes);
    return isNaN(combined) ? '' : combined.toISOString();
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (![45, 54].includes(formData.totalSeats)) {
      alert('Total seats must be 45 or 54');
      return;
    }

    const boardingPointsArray = formData.boardingPoints
      ? formData.boardingPoints.split(',').map(point => point.trim()).filter(point => point)
      : [];

    const formDataToSend = new FormData();
    for (const key in formData) {
      let value = formData[key];
      if (['departureTime', 'arrivalTime', 'destinationTime'].includes(key) && value) {
        value = combineDateAndTime(formData.date, formData[key]);
        if (!value) {
          alert(`Invalid ${key} format`);
          return;
        }
      }
      if (key === 'arrivalTime' && !value) continue;
      if (key === 'boardingPoints') {
        formDataToSend.append('boardingPoints', JSON.stringify(boardingPointsArray));
      } else {
        formDataToSend.append(key, value);
      }
    }

    if (imageFile) {
      formDataToSend.append('image', imageFile);
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/bus/${id}`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Update Bus Response:', response.data); // Debug log
      alert('Schedule updated successfully!');
      navigate('/dashboard-driver/manage-schedule', { state: { updated: true } });
    } catch (err) {
      console.error('Error updating schedule:', err);
      let errorMessage = err.response?.data?.error || 'Failed to update schedule';
      if (err.response?.status === 403) {
        errorMessage = 'Unauthorized: You are not assigned to this bus';
      } else if (err.response?.status === 404) {
        errorMessage = 'Bus not found';
      }
      alert(errorMessage);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  if (loading) return <div className="text-center py-6 text-gray-600 dark:text-gray-300">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-600 dark:text-red-400">{error}</div>;

  return (
    <div className="w-full max-w-4xl mx-auto mt-10 p-8 bg-white dark:bg-neutral-800 shadow-2xl rounded-2xl">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100 text-center">Edit Bus Schedule</h2>
      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Origin</label>
          <input
            name="source"
            value={formData.source}
            onChange={handleChange}
            placeholder="Enter Origin"
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Destination</label>
          <input
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            placeholder="Enter Destination"
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Date</label>
          <input
            name="date"
            type="date"
            value={formData.date}
            onChange={handleChange}
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Departure Time</label>
          <input
            name="departureTime"
            type="time"
            value={formData.departureTime}
            onChange={handleChange}
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Arrival Time</label>
          <input
            name="arrivalTime"
            type="time"
            value={formData.arrivalTime}
            onChange={handleChange}
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
          />
        </div>
        <div className="flex flex-col">
          <label className söyleyen="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Destination Time</label>
          <input
            name="destinationTime"
            type="time"
            value={formData.destinationTime}
            onChange={handleChange}
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Bus Name</label>
          <input
            name="busName"
            value={formData.busName}
            onChange={handleChange}
            placeholder="Enter Bus Name"
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Bus Number</label>
          <input
            name="busNumber"
            value={formData.busNumber}
            onChange={handleChange}
            placeholder="Enter Bus Number"
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Total Seats</label>
          <select
            name="totalSeats"
            value={formData.totalSeats}
            onChange={handleChange}
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
            required
          >
            <option value="" disabled>Select Total Seats</option>
            <option value="45">45</option>
            <option value="54">54</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Bus Type</label>
          <select
            name="busType"
            value={formData.busType}
            onChange={handleChange}
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
            required
          >
            <option value="AC">AC</option>
            <option value="Non-AC Seater">Non-AC Seater</option>
            <option value="Sleeper">Sleeper</option>
            <option value="Volvo">Volvo</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Fare</label>
          <input
            name="fare"
            type="number"
            min="0"
            value={formData.fare}
            onChange={handleChange}
            placeholder="Enter Fare"
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Halting Time (e.g., 30 minutes at Point A)</label>
          <input
            name="haltingTime"
            value={formData.haltingTime}
            onChange={handleChange}
            placeholder="Enter Halting Time"
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
          />
        </div>
        <div className="flex flex-col md:col-span-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Boarding Points (comma-separated, e.g., Point A, Point B)</label>
          <input
            name="boardingPoints"
            value={formData.boardingPoints}
            onChange={handleChange}
            placeholder="Enter Boarding Points"
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
          />
        </div>
        <div className="flex flex-col md:col-span-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-100 dark:file:bg-violet-600 file:text-violet-700 dark:file:text-white hover:file:bg-violet-200 dark:hover:file:bg-violet-700 transition-all duration-200"
          />
          {existingImageUrl && !imageFile && (
            <img src={existingImageUrl} alt="Current Bus" className="w-32 h-32 mt-4 object-cover rounded-lg shadow-md" />
          )}
        </div>
        <div className="md:col-span-2 text-center">
          <button
            type="submit"
            className="bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none shadow-md transition-all duration-200"
          >
            Update Schedule
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditSchedule;