import axios from "axios";
import { useAuthStore, AUTH_TOKEN_STORAGE_KEY } from "@/store/useAuthStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  let token: string | null = useAuthStore.getState().token;

  if (!token && typeof window !== "undefined") {
    token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
