import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'passenger',
    licenseId: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch('https://glide-way-backend.onrender.com/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setError(data.message || 'Signup failed');
        return;
      }

      alert('Signup successful! You can now login.');
      navigate('/login');
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to connect to server');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 px-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-800 shadow-md rounded p-6 max-w-md w-full space-y-4">
        <h2 className="text-2xl font-bold text-center text-violet-600">Create an Account</h2>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="w-full p-2 rounded border"
        >
          <option value="passenger">Passenger</option>
          <option value="driver">Driver</option>
          <option value="admin">Admin</option>
        </select>

        {/* Form fields remain the same */}
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-2 rounded border"
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          className="w-full p-2 rounded border"
          required
        />

        <input
          type="text"
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          className="w-full p-2 rounded border"
          required
        />

        {formData.role === 'driver' && (
          <input
            type="text"
            name="licenseId"
            placeholder="License ID"
            value={formData.licenseId}
            onChange={handleChange}
            className="w-full p-2 rounded border"
            required
          />
        )}

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="w-full p-2 rounded border"
          required
        />

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="w-full p-2 rounded border"
          required
        />

        <button
          type="submit"
          className="w-full bg-violet-600 text-white font-medium py-2 rounded hover:bg-violet-700 transition"
        >
          Sign Up
        </button>

        <p className="text-sm text-center text-neutral-500">
          Already have an account? <a href="/login" className="text-violet-600 hover:underline">Login</a>
        </p>
      </form>
    </div>
  );
};

export default Signup;
