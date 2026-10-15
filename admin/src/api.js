import axios from "axios";
import { beginRequest, finishRequest, updateRequest } from "./request-activity.js";

const TOKEN_KEY = "operiq-admin-jwt";
export const API_BASE_URL = String(import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export const readToken = () => localStorage.getItem(TOKEN_KEY) || "";
export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.trackProgress !== false) {
    const requestId = crypto.randomUUID();
    config.operiqRequestId = requestId;
    config.headers["X-OperIQ-Request-ID"] = requestId;
    beginRequest(requestId, config.progressLabel || (config.method === "get" ? "Loading platform data…" : "Processing the governed request…"));
  }
  return config;
});
api.interceptors.response.use(
  async (response) => { const id=response.config.operiqRequestId;if(id){try{const final=await fetch(`${API_BASE_URL}/progress/${id}`);if(final.ok)updateRequest(id,await final.json())}catch{}finishRequest(id)}return response; },
  (error) => { if (error.config?.operiqRequestId) finishRequest(error.config.operiqRequestId); return Promise.reject(error); },
);

export const messageFor = (error) =>
  error.response?.data?.error || error.message || "Request failed";
