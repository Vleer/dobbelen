import axios from "axios";

// Get the backend URL based on environment
const getBackendUrl = () => {
  const hostname = window.location.hostname;
  
  // If we're in development mode on localhost, use direct backend URL
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const url = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
    console.log('🌐 Using localhost backend URL:', url);
    return url;
  }
  
  // For all external access (including ngrok), use relative paths
  // so the nginx proxy can handle routing to the backend
  console.log('🌐 Using relative path for external access (hostname:', hostname, ')');
  return '';
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
