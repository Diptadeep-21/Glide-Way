import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const ManageSchedule = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    date: '',
    departureTime: '',
    destinationTime: '',
    busName: '',
    busNumber: '',
    totalSeats: 54,
    fare: 500,
    imageUrl: '',
    haltingTime: '',
    boardingPoints: '',
    busType: 'AC'
  });

  const [buses, setBuses] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'driver') {
      setError('Please log in as a driver to manage schedules');
      navigate('/login');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'totalSeats' || name === 'fare' ? Number(value) : value,
    }));
  };

  const fetchBuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://glide-way-backend.onrender.com/api/bus/mybuses', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Fetched Buses:', res.data); // Debug
      setBuses(res.data || []);
    } catch (err) {
      console.error('Failed to fetch buses:', err);
      setError('Failed to fetch buses');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (![45, 54].includes(formData.totalSeats)) {
      alert('Total seats must be 45 or 54');
      return;
    }

    if (!formData.date || !formData.departureTime || !formData.destinationTime) {
      alert('Please provide the date, departure time, and destination time.');
      return;
    }

    const date = new Date(formData.date);
    if (isNaN(date)) {
      alert('Invalid date format. Please select a valid date.');
      return;
    }

    const [depHours, depMinutes] = formData.departureTime.split(':').map(Number);
    const [destHours, destMinutes] = formData.destinationTime.split(':').map(Number);

    const departureDateTime = new Date(date);
    departureDateTime.setHours(depHours, depMinutes, 0, 0);

    const destinationDateTime = new Date(date);
    destinationDateTime.setHours(destHours, destMinutes, 0, 0);

    const boardingPointsArray = formData.boardingPoints
      ? formData.boardingPoints.split(',').map(point => point.trim()).filter(point => point)
      : [];

    const formDataToSend = new FormData();
    formDataToSend.append('source', formData.source);
    formDataToSend.append('destination', formData.destination);
    formDataToSend.append('date', formData.date);
    formDataToSend.append('departureTime', departureDateTime.toISOString());
    formDataToSend.append('destinationTime', destinationDateTime.toISOString());
    formDataToSend.append('busName', formData.busName);
    formDataToSend.append('busNumber', formData.busNumber);
    formDataToSend.append('totalSeats', formData.totalSeats);
    formDataToSend.append('fare', formData.fare);
    formDataToSend.append('haltingTime', formData.haltingTime || '');
    formDataToSend.append('boardingPoints', JSON.stringify(boardingPointsArray));
    formDataToSend.append('busType', formData.busType);

    if (imageFile) {
      if (!['image/jpeg', 'image/png'].includes(imageFile.type)) {
        alert('Please upload a JPG or PNG image');
        return;
      }
      console.log('Uploading Image:', imageFile.name); // Debug
      formDataToSend.append('image', imageFile);
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://glide-way-backend.onrender.com/api/bus/add', formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Add Bus Response:', res.data); // Debug
      alert(res.data.message || 'Trip added!');
      fetchBuses();
      setFormData({
        source: '',
        destination: '',
        date: '',
        departureTime: '',
        destinationTime: '',
        busName: '',
        busNumber: '',
        totalSeats: 54,
        fare: 500,
        imageUrl: '',
        haltingTime: '',
        boardingPoints: '',
        busType: 'AC' // Reset busType
      });
      setImageFile(null);
    } catch (err) {
      console.error('Error adding bus:', err);
      alert(err.response?.data?.error || 'Failed to add bus');
    }
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  useEffect(() => {
    if (location.state?.updated) {
      fetchBuses();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleDelete = async (busId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://glide-way-backend.onrender.com/api/bus/${busId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert('Bus deleted successfully');
      setBuses((prev) => prev.filter((bus) => bus._id !== busId));
    } catch (error) {
      console.error('Failed to delete bus:', error);
      alert('Failed to delete bus');
    }
  };

  const handleImageError = (e) => {
    console.log('Image Failed to Load:', e.target.src);
    e.target.src = 'http://glide-way-backend.onrender.com/Uploads/no-image.png';
  };

  if (error) return <div className="text-center py-10 text-red-600 dark:text-red-400">{error}</div>;

  return (
    <div className=" max-w-7xl mx-auto p-8 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100 text-center">Manage Bus Schedules</h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">From</label>
            <input
              name="source"
              value={formData.source}
              onChange={handleChange}
              type="text"
              placeholder="Enter Source"
              className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">To</label>
            <input
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              type="text"
              placeholder="Enter Destination"
              className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Departure Time</label>
            <input
              type="time"
              name="departureTime"
              value={formData.departureTime}
              onChange={handleChange}
              className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Destination Time</label>
            <input
              type="time"
              name="destinationTime"
              value={formData.destinationTime}
              onChange={handleChange}
              className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Bus Name</label>
            <input
              name="busName"
              value={formData.busName}
              onChange={handleChange}
              placeholder="Enter Bus Name"
              type="text"
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
              type="text"
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Fare</label>
            <input
              name="fare"
              value={formData.fare}
              onChange={handleChange}
              placeholder="Enter Fare"
              type="number"
              min="0"
              className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
              required
            />
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
              <option value="Primo">Primo</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Halting Time (e.g., 30 minutes at Point A)</label>
            <input
              name="haltingTime"
              value={formData.haltingTime}
              onChange={handleChange}
              placeholder="Enter Halting Time"
              type="text"
              className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Boarding Points (comma-separated, e.g., Point A, Point B)</label>
            <input
              name="boardingPoints"
              value={formData.boardingPoints}
              onChange={handleChange}
              placeholder="Enter Boarding Points"
              type="text"
              className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors duration-200">Upload Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            className="p-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-100 dark:file:bg-violet-600 file:text-violet-700 dark:file:text-white hover:file:bg-violet-200 dark:hover:file:bg-violet-700 transition-all duration-200"
          />
        </div>

        <div className="text-right">
          <button
            type="submit"
            className="bg-violet-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-violet-700 focus:ring-2 focus:ring-violet-500 focus:outline-none transition-all duration-200"
          >
            Add Trip
          </button>
        </div>
      </form>

      <div className="mt-8 overflow-auto max-h-[400px] border border-gray-200 dark:border-gray-600 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-neutral-700 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2 border">Bus Name</th>
              <th className="px-4 py-2 border">Type</th>
              <th className="px-4 py-2 border">Bus Number</th>
              <th className="px-4 py-2 border">From</th>
              <th className="px-4 py-2 border">To</th>
              <th className="px-4 py-2 border">Date</th>
              <th className="px-4 py-2 border">Departure Time</th>
              <th className="px-4 py-2 border">Destination Time</th>
              <th className="px-4 py-2 border">Seats</th>
              <th className="px-4 py-2 border">Fare</th>
              <th className="px-4 py-2 border">Halting Time</th>
              <th className="px-4 py-2 border">Boarding Points</th>
              <th className="px-4 py-2 border">Image</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {buses.map((bus) => (
              <tr key={bus._id} className="text-center">
                <td className="px-4 py-2 border">{bus.busName}</td>
                <td className="px-4 py-2 border">{bus.busType || 'AC'}</td>
                <td className="px-4 py-2 border">{bus.busNumber}</td>
                <td className="px-4 py-2 border">{bus.source}</td>
                <td className="px-4 py-2 border">{bus.destination}</td>
                <td className="px-4 py-2 border">
                  {bus.date ? new Date(bus.date).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-4 py-2 border">
                  {bus.departureTime
                    ? new Date(bus.departureTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    : 'N/A'}
                </td>
                <td className="px-4 py-2 border">
                  {bus.destinationTime
                    ? new Date(bus.destinationTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    : 'N/A'}
                </td>
                <td className="px-4 py-2 border">{bus.totalSeats}</td>
                <td className="px-4 py-2 border">{bus.fare}</td>
                <td className="px-4 py-2 border">{bus.haltingTime || 'N/A'}</td>
                <td className="px-4 py-2 border">{bus.boardingPoints?.join(', ') || 'N/A'}</td>
                <td className="px-4 py-2 border">
                  {bus.image ? (
                    <img
                      src={`http://glide-way-backend.onrender.com/Uploads/${bus.image}`}
                      alt="Bus"
                      className="w-[50px] h-[50px] object-cover mx-auto rounded"
                      onError={handleImageError}
                    />
                  ) : (
                    <img
                      src="http://glide-way-backend.onrender.com/Uploads/no-image.png"
                      alt="No Image"
                      className="w-[50px] h-[50px] object-cover mx-auto rounded"
                      onError={(e) => { e.target.alt = 'No Image'; e.target.style.display = 'none'; }}
                    />
                  )}
                </td>
                <td className="px-4 py-2 border">
                  <div className="flex flex-col gap-2">
                    <button
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                      onClick={() => navigate(`/edit-schedule/${bus._id}`)}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(bus._id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageSchedule;
