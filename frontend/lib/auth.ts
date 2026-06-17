"use client";

import axios from "axios";
import api from "@/lib/api";
import {
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
  type AuthRole,
  type AuthUser,
  useAuthStore,
} from "@/store/useAuthStore";

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  role: AuthRole;
};

type AuthResponse = {
  data: {
    token: string;
    user: AuthUser;
  };
};

const persistAuth = (token: string, user: AuthUser) => {
  useAuthStore.getState().setAuth(user, token);

  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  document.cookie = `auth-token=${token}; Path=/; Max-Age=604800; SameSite=Lax`;
  document.cookie = `auth-role=${user.role}; Path=/; Max-Age=604800; SameSite=Lax`;
};

export const getDashboardPath = (role: AuthRole) =>
  role === "recruiter" ? "/dashboard/recruiter" : "/dashboard/candidate";

export const loginUser = async (payload: LoginPayload) => {
  const response = await api.post<AuthResponse>("/api/auth/login", payload);
  const { token, user } = response.data.data;
  persistAuth(token, user);
  return user;
};

export const registerUser = async (payload: RegisterPayload) => {
  const response = await api.post<AuthResponse>("/api/auth/register", payload);
  const { token, user } = response.data.data;
  persistAuth(token, user);
  return user;
};

export const logoutUser = () => {
  useAuthStore.getState().clearAuth();

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    document.cookie = "auth-token=; Path=/; Max-Age=0; SameSite=Lax";
    document.cookie = "auth-role=; Path=/; Max-Age=0; SameSite=Lax";
    window.location.href = "/login";
  }
};

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const backendMessage = error.response?.data?.message;
    if (status === 401 || status === 404) {
      return backendMessage || "Invalid email or password";
    }
    if (backendMessage) return backendMessage;
    if (error.message === "Network Error") {
      return "Could not reach the server. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}
