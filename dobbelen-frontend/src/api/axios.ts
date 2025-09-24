import axios from "axios";

// Get the backend URL based on environment
const getBackendUrl = () => {
  // In development, use the hostname from the current window location
  // This allows access from other machines on the same network
  if (process.env.NODE_ENV === 'development') {
    const hostname = window.location.hostname;
    return `http://${hostname}:8080`;
  }
  // In production, you might want to use a different URL
  return process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
};

const axiosInstance = axios.create({
  baseURL: getBackendUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally
    return Promise.reject(error);
  }
);

export default axiosInstance;
