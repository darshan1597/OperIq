import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("opsdesk-jwt");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const apiError = (error) =>
  axios.isAxiosError(error)
    ? error.response?.data?.error || error.message
    : error.message || "Request failed";
