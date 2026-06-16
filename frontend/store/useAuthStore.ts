"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AuthRole = "candidate" | "recruiter";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  createdAt?: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isLoggedIn: boolean;
  hydrated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setHydrated: (value: boolean) => void;
};

export const AUTH_STORE_KEY = "inguard1-auth-store";
export const AUTH_TOKEN_STORAGE_KEY = "inguard1-auth-token";
export const AUTH_USER_STORAGE_KEY = "inguard1-auth-user";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      hydrated: false,
      setAuth: (user, token) =>
        set({
          user,
          token,
          isLoggedIn: true,
        }),
      clearAuth: () =>
        set({
          user: null,
          token: null,
          isLoggedIn: false,
        }),
      setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: AUTH_STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
