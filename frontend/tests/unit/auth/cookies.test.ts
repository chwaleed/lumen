import { describe, expect, test } from "bun:test";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  applyAuthCookies,
  clearAuthCookies,
} from "@/lib/auth/cookies";

const TOKEN_PAIR = {
  access_token: "access-token-value",
  refresh_token: "refresh-token-value",
  token_type: "bearer",
  expires_in: 900,
};

const request = { headers: new Headers(), url: "http://localhost:3000/api/auth/login" };

function setCookies() {
  const response = NextResponse.json({ success: true });
  applyAuthCookies(response, TOKEN_PAIR, request);
  return response;
}

describe("applyAuthCookies", () => {
  test("stores both tokens under their documented names", () => {
    const response = setCookies();

    expect(response.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value).toBe("access-token-value");
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value).toBe("refresh-token-value");
  });

  // httpOnly keeps the tokens away from any script on the page, which is the
  // whole reason they live in cookies instead of localStorage.
  test("marks both cookies httpOnly", () => {
    const response = setCookies();

    expect(response.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.httpOnly).toBe(true);
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.httpOnly).toBe(true);
  });

  test("uses lax sameSite so a top-level navigation keeps the session", () => {
    const response = setCookies();

    expect(response.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.sameSite).toBe("lax");
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.sameSite).toBe("lax");
  });

  test("scopes both cookies to the whole site", () => {
    const response = setCookies();

    expect(response.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.path).toBe("/");
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.path).toBe("/");
  });

  test("gives the access cookie the lifetime the server reported", () => {
    const response = setCookies();

    expect(response.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.maxAge).toBe(900);
  });

  test("outlives the access cookie with the refresh cookie", () => {
    const response = setCookies();
    const accessMaxAge = response.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.maxAge ?? 0;
    const refreshMaxAge = response.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.maxAge ?? 0;

    expect(refreshMaxAge).toBeGreaterThan(accessMaxAge);
    // Default is 7 days when REFRESH_TOKEN_EXPIRE_DAYS is unset.
    expect(refreshMaxAge).toBe(7 * 24 * 60 * 60);
  });

  // Documents a deliberate, temporary choice: cookies stay non-secure until the
  // deployment has TLS and a final domain. See the comment in lib/auth/cookies.ts.
  test("does not currently mark cookies secure", () => {
    const response = setCookies();

    expect(response.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.secure).toBe(false);
  });
});

describe("clearAuthCookies", () => {
  test("expires both cookies immediately", () => {
    const response = NextResponse.json({ success: true });
    clearAuthCookies(response, request);

    expect(response.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.maxAge).toBe(0);
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.maxAge).toBe(0);
  });

  test("blanks the stored values rather than leaving them readable", () => {
    const response = NextResponse.json({ success: true });
    applyAuthCookies(response, TOKEN_PAIR, request);
    clearAuthCookies(response, request);

    expect(response.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value).toBe("");
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value).toBe("");
  });

  test("keeps the cookies httpOnly and site-wide while clearing", () => {
    const response = NextResponse.json({ success: true });
    clearAuthCookies(response, request);

    const cleared = response.cookies.get(ACCESS_TOKEN_COOKIE_NAME);
    expect(cleared?.httpOnly).toBe(true);
    expect(cleared?.path).toBe("/");
  });
});
