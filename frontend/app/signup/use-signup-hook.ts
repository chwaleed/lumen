"use client";

import { create } from "zustand";

type SignupStatus = "idle" | "submitting" | "success" | "error";

type SignupState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  status: SignupStatus;
  message: string | null;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setConfirmPassword: (confirmPassword: string) => void;
  submit: () => Promise<boolean>;
};

const MIN_PASSWORD_LENGTH = 8;

export const useSignupHook = create<SignupState>()((set, get) => ({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  status: "idle",
  message: null,
  setName: (name) => set({ name }),
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setConfirmPassword: (confirmPassword) => set({ confirmPassword }),
  submit: async () => {
    const { name, email, password, confirmPassword } = get();

    if (!name.trim()) {
      set({ status: "error", message: "Name is required." });
      return false;
    }

    if (!email.includes("@")) {
      set({ status: "error", message: "Please enter a valid email address." });
      return false;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      set({
        status: "error",
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return false;
    }

    if (password !== confirmPassword) {
      set({ status: "error", message: "Passwords do not match." });
      return false;
    }

    set({ status: "submitting", message: null });

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !data.success) {
        set({
          status: "error",
          message: data.message ?? "Unable to create account right now.",
        });
        return false;
      }

      set({
        status: "success",
        message: data.message ?? "Account created successfully.",
      });
      return true;
    } catch {
      set({
        status: "error",
        message: "Unable to reach signup service. Please try again.",
      });
      return false;
    }
  },
}));

