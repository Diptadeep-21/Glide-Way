import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ManageDriver = () => {
  const [drivers, setDrivers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingDriver, setEditingDriver] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to access this page.');
      setLoading(false);
      navigate('/login');
      return;
    }

    fetch('http://glide-way-backend.onrender.com/api/admin/drivers', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('You do not have permission to access this page.');
          }
          throw new Error('Failed to fetch drivers.');
        }
        return res.json();
      })
      .then(data => {
        setDrivers(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [navigate]);

  const handleEdit = (driver) => {
    setEditingDriver({ ...driver });
  };

  const handleUpdate = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://glide-way-backend.onrender.com/api/admin/drivers/${editingDriver._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingDriver),
      });
      if (!res.ok) throw new Error('Failed to update driver.');
      const updatedDriver = await res.json();
      setDrivers(drivers.map(d => (d._id === updatedDriver._id ? updatedDriver : d)));
      setEditingDriver(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (driverId) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://glide-way-backend.onrender.com/api/admin/drivers/${driverId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to delete driver.');
      setDrivers(drivers.filter(d => d._id !== driverId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

  return (
    <div className="p-6 bg-white dark:bg-neutral-800 rounded shadow">
      <h2 className="text-xl font-semibold mb-4 text-violet-600">Manage Drivers</h2>
      {editingDriver && (
        <div className="mb-4 p-4 bg-neutral-100 dark:bg-neutral-700 rounded">
          <h3 className="text-lg font-medium mb-2">Edit Driver</h3>
          <input
            type="text"
            value={editingDriver.name}
            onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
            className="mb-2 p-2 border rounded w-full"
            placeholder="Driver Name"
          />
          <input
            type="email"
            value={editingDriver.email}
            onChange={(e) => setEditingDriver({ ...editingDriver, email: e.target.value })}
            className="mb-2 p-2 border rounded w-full"
            placeholder="Driver Email"
          />
          <div className="flex space-x-2">
            <button onClick={handleUpdate} className="p-2 bg-violet-600 text-white rounded hover:bg-violet-700">
              Save
            </button>
            <button onClick={() => setEditingDriver(null)} className="p-2 bg-gray-400 text-white rounded hover:bg-gray-500">
              Cancel
            </button>
          </div>
        </div>
      )}
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-neutral-200 dark:bg-neutral-700">
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Assigned Buses</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map(driver => (
            <tr key={driver._id} className="border-b dark:border-neutral-600">
              <td className="p-2">{driver.name}</td>
              <td className="p-2">{driver.email}</td>
              <td className="p-2">{driver.busCount}</td>
              <td className="p-2">
                <button
                  onClick={() => handleEdit(driver)}
                  className="mr-2 p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(driver._id)}
                  className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ManageDriver;
