import axios from "axios";

// Get the backend URL based on environment
const getBackendUrl = () => {
  // Always use the hostname from the current window location
  // This allows access from other machines on the same network
  const hostname = window.location.hostname;
  
  // If we're accessing from localhost, use the Docker internal URL
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const url = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
    console.log('🌐 Using localhost backend URL:', url);
    return url;
  }
  
  // For external access, use the same hostname as the frontend
  const url = `http://${hostname}:8080`;
  console.log('🌐 Using external backend URL:', url, 'for hostname:', hostname);
  return url;
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
