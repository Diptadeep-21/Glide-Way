// src/utils/axios.js
import axios from 'axios';

const instance = axios.create({
  baseURL: 'https://glide-way-backend.onrender.com/api', // Replace with your backend URL
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

export default instance;
