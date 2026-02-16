import axios from "axios";
import { validateToken } from "@/helpers/tokenUtils";
import { getAuthCookie, removeAuthCookie } from "@/helpers/cookieUtils";

// Server-safe axios instance for API calls
export const serverAxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Client axios instance with auth interceptors
console.log("Axios Base URL:", process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000");
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000",


  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token (only in browser)
if (typeof window !== 'undefined') {
  axiosInstance.interceptors.request.use(
    (config) => {
      // Check localStorage first
      let token = localStorage.getItem('authToken');

      // Fallback to cookie if localStorage is empty
      if (!token) {
        token = getAuthCookie();

        // Sync to localStorage if found in cookie
        if (token) {
          localStorage.setItem('authToken', token);
        }
      }

      // Validate token before using it
      if (token && validateToken(token)) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (token) {
        // Token exists but is invalid/expired - clear it
        console.log('Axios interceptor: Clearing invalid/expired token');
        localStorage.removeItem('authToken');
        removeAuthCookie();
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
}

// Add response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access (only in browser)
      if (typeof window !== 'undefined') {
        console.log('Axios interceptor: 401 error, clearing auth state');
        localStorage.removeItem('authToken');
        removeAuthCookie();

        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

