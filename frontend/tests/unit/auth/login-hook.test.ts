import { beforeEach, describe, expect, test } from "bun:test";
import { axiosRequest, respondWithApi, resetAxiosMock } from "../support/axios-mock";
import { useLoginHook } from "@/app/login/use-login-hook";

const INITIAL_STATE = useLoginHook.getState();
const store = () => useLoginHook.getState();

beforeEach(() => {
  useLoginHook.setState(INITIAL_STATE, true);
  resetAxiosMock();
  respondWithApi(200, { success: true, message: "Logged in." });
});

function fillValidCredentials() {
  store().setEmail("someone@example.com");
  store().setPassword("password123");
}

describe("client-side validation", () => {
  test("rejects an email with no @ without calling the API", async () => {
    store().setEmail("not-an-email");
    store().setPassword("password123");

    expect(await store().submit()).toBe(false);
    expect(store().status).toBe("error");
    expect(store().errorMessage).toBe("Please enter a valid email address.");
    expect(axiosRequest).not.toHaveBeenCalled();
  });

  test("rejects a password under eight characters without calling the API", async () => {
    store().setEmail("someone@example.com");
    store().setPassword("short");

    expect(await store().submit()).toBe(false);
    expect(store().errorMessage).toBe("Password must be at least 8 characters.");
    expect(axiosRequest).not.toHaveBeenCalled();
  });

  test("accepts a password of exactly eight characters", async () => {
    store().setEmail("someone@example.com");
    store().setPassword("12345678");

    expect(await store().submit()).toBe(true);
    expect(axiosRequest).toHaveBeenCalled();
  });
});

describe("submission", () => {
  test("posts the credentials to the login route", async () => {
    fillValidCredentials();
    await store().submit();

    expect(axiosRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/auth/login",
        method: "POST",
        data: { email: "someone@example.com", password: "password123" },
      }),
    );
  });

  test("reports success and clears any previous error", async () => {
    fillValidCredentials();
    useLoginHook.setState({ errorMessage: "an older failure" });

    expect(await store().submit()).toBe(true);
    expect(store().status).toBe("success");
    expect(store().errorMessage).toBeNull();
  });

  test("surfaces the server's message on rejection", async () => {
    respondWithApi(401, { success: false, message: "Invalid email or password." });
    fillValidCredentials();

    expect(await store().submit()).toBe(false);
    expect(store().status).toBe("error");
    expect(store().errorMessage).toBe("Invalid email or password.");
  });

  // requestApi reports a missing message as null precisely so each caller can
  // supply wording that fits its own screen.
  test("falls back to its own wording when the server sends no message", async () => {
    respondWithApi(500, { success: false, message: null });
    fillValidCredentials();

    await store().submit();

    expect(store().errorMessage).toBe("Unable to log in right now.");
  });

  // A 200 carrying success:false still means the login did not happen.
  test("treats an unsuccessful payload as a failure even on a 2xx", async () => {
    respondWithApi(200, { success: false, message: "Account locked." });
    fillValidCredentials();

    expect(await store().submit()).toBe(false);
    expect(store().errorMessage).toBe("Account locked.");
  });

  test("reports a failure when the service is unreachable", async () => {
    const { respondWith } = await import("../support/axios-mock");
    respondWith(new Error("ECONNREFUSED"));
    fillValidCredentials();

    expect(await store().submit()).toBe(false);
    expect(store().errorMessage).toBe("Unable to reach the service.");
  });
});

describe("form state", () => {
  test("toggles password visibility", () => {
    expect(store().showPassword).toBe(false);

    store().toggleShowPassword();
    expect(store().showPassword).toBe(true);

    store().toggleShowPassword();
    expect(store().showPassword).toBe(false);
  });
});
