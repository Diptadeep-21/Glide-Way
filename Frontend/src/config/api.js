const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'https://glide-way-backend.onrender.com';

export default API_BASE_URL;
