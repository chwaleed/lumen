"use client";

import { create } from "zustand";
import { postApi } from "@/lib/http/client";

type SignupStatus = "idle" | "submitting" | "success" | "error";

type SignupSubmitResult = {
  success: boolean;
  sessionEstablished: boolean;
};

type SignupState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  status: SignupStatus;
  message: string | null;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setConfirmPassword: (confirmPassword: string) => void;
  toggleShowPassword: () => void;
  submit: () => Promise<SignupSubmitResult>;
};

const MIN_PASSWORD_LENGTH = 8;

export const useSignupHook = create<SignupState>()((set, get) => ({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  showPassword: false,
  status: "idle",
  message: null,
  setName: (name) => set({ name }),
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setConfirmPassword: (confirmPassword) => set({ confirmPassword }),
  toggleShowPassword: () => set((state) => ({ showPassword: !state.showPassword })),
  submit: async () => {
    const { name, email, password, confirmPassword } = get();

    if (!name.trim()) {
      set({ status: "error", message: "Name is required." });
      return { success: false, sessionEstablished: false };
    }

    if (!email.includes("@")) {
      set({ status: "error", message: "Please enter a valid email address." });
      return { success: false, sessionEstablished: false };
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      set({
        status: "error",
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return { success: false, sessionEstablished: false };
    }

    if (password !== confirmPassword) {
      set({ status: "error", message: "Passwords do not match." });
      return { success: false, sessionEstablished: false };
    }

    set({ status: "submitting", message: null });

    const { status, payload } = await postApi<{ sessionEstablished?: boolean }>("/api/auth/signup", {
      name,
      email,
      password,
    });

    if (status < 200 || status >= 300 || !payload.success) {
      set({
        status: "error",
        message: payload.message ?? "Unable to create account right now.",
      });
      return { success: false, sessionEstablished: false };
    }

    set({
      status: "success",
      message:
        payload.message ??
        (payload.data?.sessionEstablished
          ? "Account created successfully."
          : "Account created successfully. Please log in to continue."),
    });
    return {
      success: true,
      sessionEstablished: Boolean(payload.data?.sessionEstablished),
    };
  },
}));
