import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`https://glide-way-backend.onrender.com/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      alert(data.message);
      if (res.ok) navigate('/login');
    } catch (err) {
      console.error(err);
      alert('Reset failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 px-4">
      <form onSubmit={handleReset} className="bg-white dark:bg-neutral-800 shadow-md rounded p-6 max-w-md w-full space-y-4">
        <h2 className="text-xl font-bold text-center">Reset Password</h2>
        <input type="password" placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 rounded border" required />
        <button type="submit" className="bg-violet-600 text-white px-4 py-2 rounded w-full hover:bg-violet-700">Reset Password</button>
      </form>
    </div>
  );
};

export default ResetPassword;
