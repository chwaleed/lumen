"use client";

import { create } from "zustand";
import { postApi } from "@/lib/http/client";

type LoginStatus = "idle" | "submitting" | "success" | "error";

type LoginState = {
  email: string;
  password: string;
  status: LoginStatus;
  errorMessage: string | null;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  submit: () => Promise<boolean>;
};

const MIN_PASSWORD_LENGTH = 8;

export const useLoginHook = create<LoginState>()((set, get) => ({
  email: "",
  password: "",
  status: "idle",
  errorMessage: null,
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  submit: async () => {
    const { email, password } = get();

    if (!email.includes("@")) {
      set({ status: "error", errorMessage: "Please enter a valid email address." });
      return false;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      set({
        status: "error",
        errorMessage: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return false;
    }

    set({ status: "submitting", errorMessage: null });

    const { status, payload } = await postApi<null>("/api/auth/login", { email, password });

    if (status < 200 || status >= 300 || !payload.success) {
      set({
        status: "error",
        errorMessage: payload.message ?? "Unable to log in right now.",
      });
      return false;
    }

    set({ status: "success", errorMessage: null });
    return true;
  },
}));
