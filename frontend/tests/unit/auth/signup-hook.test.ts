import { beforeEach, describe, expect, test } from "bun:test";
import { axiosRequest, respondWithApi, resetAxiosMock } from "../support/axios-mock";
import { useSignupHook } from "@/app/signup/use-signup-hook";

const INITIAL_STATE = useSignupHook.getState();
const store = () => useSignupHook.getState();

beforeEach(() => {
  useSignupHook.setState(INITIAL_STATE, true);
  resetAxiosMock();
  respondWithApi(201, { success: true, message: null, data: { sessionEstablished: true } });
});

function fillValidForm() {
  store().setName("Ada Lovelace");
  store().setEmail("ada@example.com");
  store().setPassword("password123");
  store().setConfirmPassword("password123");
}

describe("client-side validation", () => {
  test("requires a name", async () => {
    fillValidForm();
    store().setName("   ");

    const result = await store().submit();

    expect(result.success).toBe(false);
    expect(store().message).toBe("Name is required.");
    expect(axiosRequest).not.toHaveBeenCalled();
  });

  test("requires an email containing @", async () => {
    fillValidForm();
    store().setEmail("ada-at-example");

    await store().submit();

    expect(store().message).toBe("Please enter a valid email address.");
    expect(axiosRequest).not.toHaveBeenCalled();
  });

  test("requires at least eight password characters", async () => {
    fillValidForm();
    store().setPassword("short");
    store().setConfirmPassword("short");

    await store().submit();

    expect(store().message).toBe("Password must be at least 8 characters.");
    expect(axiosRequest).not.toHaveBeenCalled();
  });

  test("requires the confirmation to match", async () => {
    fillValidForm();
    store().setConfirmPassword("password124");

    await store().submit();

    expect(store().message).toBe("Passwords do not match.");
    expect(axiosRequest).not.toHaveBeenCalled();
  });

  // The name check runs first, so a form wrong in several ways reports that one.
  test("reports the first failing rule", async () => {
    store().setName("");
    store().setEmail("nope");
    store().setPassword("x");

    await store().submit();

    expect(store().message).toBe("Name is required.");
  });
});

describe("submission", () => {
  test("posts name, email and password but never the confirmation", async () => {
    fillValidForm();
    await store().submit();

    expect(axiosRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/auth/signup",
        method: "POST",
        data: { name: "Ada Lovelace", email: "ada@example.com", password: "password123" },
      }),
    );
  });

  test("reports an established session so the caller can skip the login screen", async () => {
    fillValidForm();

    const result = await store().submit();

    expect(result).toEqual({ success: true, sessionEstablished: true });
    expect(store().status).toBe("success");
  });

  test("tells the caller to log in when no session was established", async () => {
    respondWithApi(201, { success: true, message: null, data: { sessionEstablished: false } });
    fillValidForm();

    const result = await store().submit();

    expect(result).toEqual({ success: true, sessionEstablished: false });
    expect(store().message).toBe("Account created successfully. Please log in to continue.");
  });

  test("treats a missing data payload as no session", async () => {
    respondWithApi(201, { success: true, message: null, data: null });
    fillValidForm();

    expect((await store().submit()).sessionEstablished).toBe(false);
  });

  test("surfaces the server's rejection message", async () => {
    respondWithApi(400, { success: false, message: "A user with this email already exists." });
    fillValidForm();

    const result = await store().submit();

    expect(result.success).toBe(false);
    expect(store().status).toBe("error");
    expect(store().message).toBe("A user with this email already exists.");
  });

  test("falls back to its own wording when the server sends no message", async () => {
    respondWithApi(500, { success: false, message: null });
    fillValidForm();

    await store().submit();

    expect(store().message).toBe("Unable to create account right now.");
  });
});
