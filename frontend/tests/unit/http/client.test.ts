import { beforeEach, describe, expect, test } from "bun:test";
import { axiosRequest, respondWith, resetAxiosMock } from "../support/axios-mock";
import { postApi, requestApi } from "@/lib/http/client";

beforeEach(resetAxiosMock);

describe("success reporting", () => {
  test("trusts an explicit success flag from the body", async () => {
    respondWith({ status: 200, data: { success: true, message: "Done.", data: { id: 1 } } });

    const { status, payload } = await requestApi<{ id: number }>("/api/thing");

    expect(status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toBe("Done.");
    expect(payload.data).toEqual({ id: 1 });
  });

  test("trusts an explicit failure flag even on a 200", async () => {
    respondWith({ status: 200, data: { success: false, message: "Nope." } });

    expect((await requestApi("/api/thing")).payload.success).toBe(false);
  });

  // axios is configured with validateStatus: () => true, so every status arrives
  // here as a resolved response and the range must be checked explicitly.
  test.each([
    [200, true],
    [201, true],
    [299, true],
    [300, false],
    [400, false],
    [401, false],
    [500, false],
    [502, false],
  ])("infers success from status %i as %p when the body has no flag", async (status, expected) => {
    respondWith({ status, data: null });

    expect((await requestApi("/api/thing")).payload.success).toBe(expected);
  });
});

describe("message handling", () => {
  test("passes a server message through untouched", async () => {
    respondWith({ status: 400, data: { success: false, message: "Invalid email or password." } });

    expect((await requestApi("/api/thing")).payload.message).toBe("Invalid email or password.");
  });

  // Callers each append their own context-specific wording with `?? "..."`,
  // which only works if a missing message arrives as null.
  test("reports a missing message as null", async () => {
    respondWith({ status: 500, data: "<html>Internal Server Error</html>" });

    expect((await requestApi("/api/thing")).payload.message).toBeNull();
  });

  test("reports a blank message as null", async () => {
    respondWith({ status: 500, data: { success: false, message: "" } });

    expect((await requestApi("/api/thing")).payload.message).toBeNull();
  });
});

describe("transport failures", () => {
  test("turns a thrown request into a 502 rather than propagating", async () => {
    respondWith(new Error("ECONNREFUSED"));

    const { status, payload } = await requestApi("/api/thing");

    expect(status).toBe(502);
    expect(payload.success).toBe(false);
    expect(payload.message).toBe("Unable to reach the service.");
    expect(payload.data).toBeNull();
  });
});

describe("request shaping", () => {
  test("defaults to GET with no body", async () => {
    await requestApi("/api/thing");

    expect(axiosRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/api/thing", method: "GET" }),
    );
  });

  test("postApi sends a POST carrying the body", async () => {
    await postApi("/api/thing", { name: "x" });

    expect(axiosRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/api/thing", method: "POST", data: { name: "x" } }),
    );
  });

  test("missing data in the body becomes null rather than undefined", async () => {
    respondWith({ status: 200, data: { success: true, message: "ok" } });

    expect((await requestApi("/api/thing")).payload.data).toBeNull();
  });
});
