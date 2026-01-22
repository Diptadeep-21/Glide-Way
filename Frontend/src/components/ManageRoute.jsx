import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ManageRoute = () => {
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to access this page.');
      setLoading(false);
      navigate('/login');
      return;
    }

    fetch('https://glide-way-backend.onrender.com/api/admin/routes', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('You do not have permission to access this page.');
          }
          throw new Error('Failed to fetch routes.');
        }
        return res.json();
      })
      .then(data => {
        setRoutes(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [navigate]);

  const handleDelete = async (route) => {
    if (!window.confirm(`Are you sure you want to delete the route ${route.source} to ${route.destination}? This will delete all associated buses and bookings.`)) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('https://glide-way-backend.onrender.com/api/admin/routes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ source: route.source, destination: route.destination }),
      });
      if (!res.ok) throw new Error('Failed to delete route.');
      setRoutes(routes.filter(r => !(r.source === route.source && r.destination === route.destination)));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

  return (
    <div className="p-6 bg-white dark:bg-neutral-800 rounded shadow">
      <h2 className="text-xl font-semibold mb-4 text-violet-600">Manage Routes</h2>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-neutral-200 dark:bg-neutral-700">
            <th className="p-2">Route</th>
            <th className="p-2">Buses</th>
            <th className="p-2">Bookings</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {routes.map(route => (
            <tr key={`${route.source}-${route.destination}`} className="border-b dark:border-neutral-600">
              <td className="p-2">{route.source} to {route.destination}</td>
              <td className="p-2">{route.busCount}</td>
              <td className="p-2">{route.bookingCount}</td>
              <td className="p-2">
                <button
                  onClick={() => handleDelete(route)}
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

export default ManageRoute;
