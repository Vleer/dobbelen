import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:8080", // Backend running on port 8080
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
