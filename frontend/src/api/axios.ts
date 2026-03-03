import axios from "axios";

// Get the backend URL based on environment
const getBackendUrl = () => {
  // Development: always use local backend so dev machine is isolated from server
  if (process.env.NODE_ENV === 'development') {
    const url = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
    console.log('🌐 [DEV] Using isolated local backend:', url);
    return url;
  }

  // Check if we're running in Kubernetes (via ingress)
  // In K8s with ingress, we use the app's base path for API routing
  if (process.env.REACT_APP_USE_INGRESS === 'true') {
    // Get the base path from PUBLIC_URL (e.g., /dobbelen)
    const basePath = process.env.PUBLIC_URL || '';
    console.log('🌐 Using Kubernetes ingress routing with base path:', basePath);
    return basePath;  // This will make /api/games become /dobbelen/api/games
  }

  // Production: use hostname so same-origin or explicit URL works
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const url = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
    console.log('🌐 Using localhost backend URL:', url);
    return url;
  }

  // For external access, use same-origin and let nginx proxy /api to backend
  console.log('🌐 Using same-origin backend routing for hostname:', hostname);
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
