import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getApiBaseUrl } from "../config/backend";
import { isTransientHttpError, sleep } from "../utils/httpError";

type RetryConfig = InternalAxiosRequestConfig & {
  __retryCount?: number;
  /** Max retries for transient failures (default: GET-like 2, others 0). */
  retry?: number;
};

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 12_000,
  headers: {
    "Content-Type": "application/json",
  },
});

function defaultRetryCount(config: RetryConfig): number {
  if (typeof config.retry === "number") return config.retry;
  const method = (config.method ?? "get").toLowerCase();
  // Safe to auto-retry reads; mutations are handled by callers (reconcile / explicit retry).
  return method === "get" || method === "head" || method === "options" ? 2 : 0;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    if (!config || !isTransientHttpError(error)) {
      return Promise.reject(error);
    }

    const max = defaultRetryCount(config);
    const attempt = config.__retryCount ?? 0;
    if (attempt >= max) {
      return Promise.reject(error);
    }

    config.__retryCount = attempt + 1;
    await sleep(300 * 2 ** attempt);
    return axiosInstance.request(config);
  }
);

export default axiosInstance;
