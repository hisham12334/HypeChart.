import axios from 'axios';

// Create a configured Axios instance
export const apiClient = axios.create({
  // Use the environment variable, or fallback to localhost:4000
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});