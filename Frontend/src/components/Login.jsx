import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('passenger');
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('https://glide-way-backend.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Login failed');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      alert('An error occurred during login.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 px-4">
      <form onSubmit={handleLogin} className="bg-white dark:bg-neutral-800 shadow-md rounded p-6 max-w-md w-full space-y-4">
        <h2 className="text-xl font-bold mb-2 text-center">Login</h2>
        
        <select 
          value={role} 
          onChange={(e) => setRole(e.target.value)} 
          className="w-full p-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
        >
          <option value="passenger">Passenger</option>
          <option value="driver">Driver</option>
          <option value="admin">Admin</option>
        </select>
        
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          className="w-full p-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
          required 
        />
        
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          className="w-full p-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
          required 
        />
        
        <button 
          type="submit" 
          className="bg-violet-600 text-white px-4 py-2 rounded w-full hover:bg-violet-700"
        >
          Login
        </button>
        
        <p className="text-sm text-center mt-2">
          <a href="/forgot-password" className="text-violet-600 hover:underline">
            Forgot Password?
          </a>
        </p>
      </form>
    </div>
  );
};

export default Login;
