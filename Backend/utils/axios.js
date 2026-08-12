// src/utils/axios.js
import axios from 'axios';

const instance = axios.create({
  baseURL: (process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000') + '/api', // Replace with your backend URL
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

export default instance;
