import { createAsyncThunk } from "@reduxjs/toolkit";
import { authService } from "./authService";
import {
  setUser,
  clearUser,
  setError,
  setLoading,
  setReady,
} from "./authSlice";
import type { UserRole } from "./authTypes";
import { clearQueue } from "../queue/queueSlice";
const API_URL = import.meta.env.VITE_API_BASE_URL as string;

function getRoleFromGroups(groups: string[]): UserRole {
  if (groups.includes("Admin")) return "admin";
  if (groups.includes("Driver")) return "driver";
  return "student";
}

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (
    { email, password }: { email: string; password: string },
    { dispatch },
  ) => {
    try {
      dispatch(setLoading(true));
      await authService.login(email, password);
      const session = await authService.getSession();
      const payload = session.tokens?.idToken?.payload;
      const groups = (payload?.["cognito:groups"] ?? []) as string[];
      const role = getRoleFromGroups(groups);
      dispatch(
        setUser({
          user: {
            id: typeof payload?.sub === "string" ? payload.sub : "",
            email: typeof payload?.email === "string" ? payload.email : "",
            role,
          },
          role,
        }),
      );
      return role;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      dispatch(setError(message));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  },
);

export const registerThunk = createAsyncThunk(
  "auth/register",
  async (
    {
      email,
      password,
      firstName,
      lastName,
    }: { email: string; password: string; firstName: string; lastName: string },
    { dispatch, rejectWithValue },
  ) => {
    try {
      dispatch(setLoading(true));
      await authService.register(email, password, firstName, lastName);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      console.log("Thunk caught error:", message, err);
      dispatch(setError(message));
      return rejectWithValue(message);
    } finally {
      dispatch(setLoading(false));
    }
  },
);

export const verifyThunk = createAsyncThunk(
  "auth/verify",
  async ({ email, code }: { email: string; code: string }, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      await authService.confirmCode(email, code);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Verification failed";
      dispatch(setError(message));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  },
);

export const logoutThunk = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch }) => {
    // Leave queue before logging out
    try {
      const session = await authService.getSession();
      const token = session.tokens?.idToken?.toString();
      if (token) {
        await fetch(`${API_URL}/queue/leave`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // silent fail — logout regardless
    }

    await authService.logout();
    dispatch(clearUser());
    dispatch(clearQueue());
  },
);
export const restoreSessionThunk = createAsyncThunk(
  "auth/restoreSession",
  async (_, { dispatch }) => {
    try {
      const session = await authService.getSession();
      const payload = session.tokens?.idToken?.payload;
      if (!payload) {
        dispatch(setReady());
        return;
      }
      const groups = (payload["cognito:groups"] ?? []) as string[];
      const role = getRoleFromGroups(groups);
      dispatch(
        setUser({
          user: {
            id: typeof payload?.sub === "string" ? payload.sub : "",
            email: typeof payload?.email === "string" ? payload.email : "",
            role,
          },

          role,
        }),
      );
    } catch {
      dispatch(setReady());
    }
  },
);
