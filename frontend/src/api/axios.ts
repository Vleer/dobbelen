import axios from "axios";

// Get the backend URL based on environment
const getBackendUrl = () => {
  // Check if we're running in Kubernetes (via ingress)
  // In K8s with ingress, we use relative paths so ingress routes /api/* to backend
  if (process.env.REACT_APP_USE_INGRESS === 'true') {
    console.log('🌐 Using Kubernetes ingress routing: /api');
    return '';  // Empty baseURL means relative paths like /api/games
  }
  
  // Always use the hostname from the current window location
  // This allows access from other machines on the same network
  const hostname = window.location.hostname;
  
  // If we're accessing from localhost, use the Docker internal URL
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const url = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
    console.log('🌐 Using localhost backend URL:', url);
    return url;
  }
  
  // For external access, use the backend port from env or default to NodePort
  const backendPort = process.env.REACT_APP_BACKEND_PORT || '30083';
  const url = `http://${hostname}:${backendPort}`;
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
