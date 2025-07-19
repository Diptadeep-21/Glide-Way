import React, { useState } from 'react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('https://glide-way-backend.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      alert(data.message);
    } catch (err) {
      console.error(err);
      alert('Error sending reset link.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 px-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-800 shadow-md rounded p-6 max-w-md w-full space-y-4">
        <h2 className="text-xl font-bold text-center">Forgot Password</h2>
        <input type="email" placeholder="Your Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 rounded border" required />
        <button type="submit" className="bg-violet-600 text-white px-4 py-2 rounded w-full hover:bg-violet-700">Send Reset Link</button>
      </form>
    </div>
  );
};

export default ForgotPassword;
