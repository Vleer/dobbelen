import axios from "axios";
import { getApiBaseUrl } from "../config/backend";
import { installAuthInterceptor } from "./authInterceptor";

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Sends the per-player session token on every game-scoped request.
installAuthInterceptor(axiosInstance as never);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally
    return Promise.reject(error);
  }
);

export default axiosInstance;