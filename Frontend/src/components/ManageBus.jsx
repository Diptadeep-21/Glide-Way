import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';


const ManageBus = () => {
  const [buses, setBuses] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingBus, setEditingBus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to access this page.');
      setLoading(false);
      navigate('/login');
      return;
    }

    fetch('httpss://glide-way-backend.onrender.com/api/admin/buses', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('You do not have permission to access this page.');
          }
          throw new Error(`Failed to fetch buses. Status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Fetched buses:', data);
        setBuses(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [navigate]);

  const handleEdit = (bus) => {
    setEditingBus({ ...bus });
  };

  const handleUpdate = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`httpss://glide-way-backend.onrender.com/api/admin/buses/${editingBus._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingBus),
      });
      if (!res.ok) throw new Error('Failed to update bus.');
      const updatedBus = await res.json();
      setBuses(buses.map(b => (b._id === updatedBus._id ? updatedBus : b)));
      setEditingBus(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (busId) => {
    if (!window.confirm('Are you sure you want to delete this bus?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`httpss://glide-way-backend.onrender.com/api/admin/buses/${busId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to delete bus.');
      setBuses(buses.filter(b => b._id !== busId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

  return (

   
    <div className="p-6 bg-white dark:bg-neutral-800 rounded shadow">
      <h2 className="text-xl font-semibold mb-4 text-violet-600">Manage Buses</h2>
      {editingBus && (
        <div className="mb-4 p-4 bg-neutral-100 dark:bg-neutral-700 rounded">
          <h3 className="text-lg font-medium mb-2">Edit Bus</h3>
          <input
            type="text"
            value={editingBus.busName}
            onChange={(e) => setEditingBus({ ...editingBus, busName: e.target.value })}
            className="mb-2 p-2 border rounded w-full"
            placeholder="Bus Name"
          />
          <input
            type="text"
            value={editingBus.busNumber}
            onChange={(e) => setEditingBus({ ...editingBus, busNumber: e.target.value })}
            className="mb-2 p-2 border rounded w-full"
            placeholder="Bus Number"
          />
          <input
            type="text"
            value={editingBus.source}
            onChange={(e) => setEditingBus({ ...editingBus, source: e.target.value })}
            className="mb-2 p-2 border rounded w-full"
            placeholder="Source"
          />
          <input
            type="text"
            value={editingBus.destination}
            onChange={(e) => setEditingBus({ ...editingBus, destination: e.target.value })}
            className="mb-2 p-2 border rounded w-full"
            placeholder="Destination"
          />
          <input
            type="date"
            value={new Date(editingBus.date).toISOString().split('T')[0]}
            onChange={(e) => setEditingBus({ ...editingBus, date: e.target.value })}
            className="mb-2 p-2 border rounded w-full"
          />
          <input
            type="datetime-local"
            value={new Date(editingBus.departureTime).toISOString().slice(0, 16)}
            onChange={(e) => setEditingBus({ ...editingBus, departureTime: e.target.value })}
            className="mb-2 p-2 border rounded w-full"
          />
          <input
            type="number"
            value={editingBus.totalSeats}
            onChange={(e) => setEditingBus({ ...editingBus, totalSeats: Number(e.target.value) })}
            className="mb-2 p-2 border rounded w-full"
            placeholder="Total Seats"
          />
          <input
            type="number"
            value={editingBus.fare}
            onChange={(e) => setEditingBus({ ...editingBus, fare: Number(e.target.value) })}
            className="mb-2 p-2 border rounded w-full"
            placeholder="Fare"
          />
          <div className="flex space-x-2">
            <button onClick={handleUpdate} className="p-2 bg-violet-600 text-white rounded hover:bg-violet-700">
              Save
            </button>
            <button onClick={() => setEditingBus(null)} className="p-2 bg-gray-400 text-white rounded hover:bg-gray-500">
              Cancel
            </button>
          </div>
        </div>
      )}
      {buses.length === 0 ? (
        <p className="text-neutral-600 dark:text-neutral-300">No buses found.</p>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-200 dark:bg-neutral-700">
              <th className="p-2">Bus Name</th>
              <th className="p-2">Bus Number</th>
              <th className="p-2">Route</th>
              <th className="p-2">Departure</th>
              <th className="p-2">Seats</th>
              <th className="p-2">Fare</th>
              <th className="p-2">Driver</th>
              <th className="p-2">Bookings</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {buses.map(bus => (
              <tr key={bus._id} className="border-b dark:border-neutral-600">
                <td className="p-2">{bus.busName}</td>
                <td className="p-2">{bus.busNumber}</td>
                <td className="p-2">{bus.source} to {bus.destination}</td>
                <td className="p-2">{new Date(bus.departureTime).toLocaleString('en-IN')}</td>
                <td className="p-2">{bus.bookedSeats.length}/{bus.totalSeats}</td>
                <td className="p-2">₹{bus.fare}</td>
                <td className="p-2">{bus.driverId ? bus.driverId.name : 'Unassigned'}</td>
                <td className="p-2">{bus.bookingCount}</td>
                <td className="p-2">
                  <button
                    onClick={() => handleEdit(bus)}
                    className="mr-2 p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(bus._id)}
                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ManageBus;
