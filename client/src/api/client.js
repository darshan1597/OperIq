import axios from "axios";
import { beginRequest, finishRequest, updateRequest } from "./request-activity.js";

export const AUTH_TOKEN_KEY = "operiq-jwt";
const LEGACY_AUTH_TOKEN_KEY = "opsdesk-jwt";
export const API_BASE_URL = String(import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export function readAuthToken() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) return token;

  const legacyToken = localStorage.getItem(LEGACY_AUTH_TOKEN_KEY);
  if (legacyToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  }
  return legacyToken || "";
}

export function storeAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});
apiClient.interceptors.request.use((config) => {
  const token = readAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.trackProgress !== false) {
    const requestId = crypto.randomUUID();
    config.operiqRequestId = requestId;
    config.headers["X-OperIQ-Request-ID"] = requestId;
    beginRequest(requestId, config.progressLabel || (config.method === "get" ? "Loading the latest data…" : "Processing your request…"));
  }
  return config;
});
apiClient.interceptors.response.use(
  async (response) => { const id=response.config.operiqRequestId;if(id){try{const final=await fetch(`${API_BASE_URL}/progress/${id}`);if(final.ok)updateRequest(id,await final.json())}catch{}finishRequest(id)}return response; },
  (error) => { if (error.config?.operiqRequestId) finishRequest(error.config.operiqRequestId); return Promise.reject(error); },
);
export const apiError = (error) =>
  axios.isAxiosError(error)
    ? error.response?.data?.error || error.message
    : error.message || "Request failed";
