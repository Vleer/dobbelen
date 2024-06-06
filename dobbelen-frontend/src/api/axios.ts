import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:48080", // Replace with your backend base URL
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
