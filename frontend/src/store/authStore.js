// Store: authStore.js
// Zustand global state for authentication.
// Persists tokens in localStorage for session continuity.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../services/api";
import toast from "react-hot-toast";

/**
 * useAuthStore
 * Global authentication state and actions.
 * Persisted to localStorage under the key "lms_auth".
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,

      // ── Actions ──────────────────────────────────

      /**
       * login - Calls the auth API and stores the user/tokens.
       * @param {{ email, password }} credentials
       */
      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/login", credentials);
          set({
            user:         data.data.user,
            accessToken:  data.data.accessToken,
            refreshToken: data.data.refreshToken,
            isLoading:    false,
          });
          // Attach the access token to all future requests
          api.defaults.headers.common["Authorization"] = `Bearer ${data.data.accessToken}`;
          toast.success(`Welcome back, ${data.data.user.name}!`);
          return true;
        } catch (err) {
          set({ isLoading: false });
          toast.error(err.response?.data?.message || "Login failed");
          return false;
        }
      },

      /**
       * register - Registers a new user and logs them in.
       * @param {{ name, email, password, role }} payload
       */
      register: async (payload) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/register", payload);
          set({
            user:         data.data.user,
            accessToken:  data.data.accessToken,
            refreshToken: data.data.refreshToken,
            isLoading:    false,
          });
          api.defaults.headers.common["Authorization"] = `Bearer ${data.data.accessToken}`;
          toast.success("Account created! Welcome aboard 🎉");
          return true;
        } catch (err) {
          set({ isLoading: false });
          toast.error(err.response?.data?.message || "Registration failed");
          return false;
        }
      },

      /**
       * logout - Calls the logout API then clears local state.
       */
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch {
          // Proceed with local logout even if API call fails
        }
        delete api.defaults.headers.common["Authorization"];
        set({ user: null, accessToken: null, refreshToken: null });
        toast.success("Logged out successfully");
      },

      /**
       * updateUser - Merges profile updates into the store.
       * @param {object} updatedUser
       */
      updateUser: (updatedUser) => {
        set((state) => ({ user: { ...state.user, ...updatedUser } }));
      },

      /**
       * setAccessToken - Updates the stored access token (used by refresh interceptor).
       * @param {string} token
       */
      setAccessToken: (token) => {
        set({ accessToken: token });
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      },

      // ── Getters ──────────────────────────────────
      isAuthenticated: () => !!get().user && !!get().accessToken,
      isAdmin:         () => get().user?.role === "admin",
      isInstructor:    () => get().user?.role === "instructor",
      isStudent:       () => get().user?.role === "student",
    }),
    {
      name:    "lms_auth",
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export default useAuthStore;
