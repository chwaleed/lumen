import { NextResponse } from "next/server";
import type { TokenPair } from "@/lib/auth/backend";

export const ACCESS_TOKEN_COOKIE_NAME = "lumen_access_token";
export const REFRESH_TOKEN_COOKIE_NAME = "lumen_refresh_token";

function isSecureCookie() {
  return process.env.NODE_ENV === "production";
}

function getRefreshTokenMaxAge() {
  const refreshTokenExpireDays = Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS ?? "7");
  const safeExpireDays = Number.isFinite(refreshTokenExpireDays) && refreshTokenExpireDays > 0 ? refreshTokenExpireDays : 7;
  return safeExpireDays * 24 * 60 * 60;
}

export function applyAuthCookies(response: NextResponse, tokenPair: TokenPair) {
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE_NAME,
    value: tokenPair.access_token,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: tokenPair.expires_in,
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE_NAME,
    value: tokenPair.refresh_token,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: getRefreshTokenMaxAge(),
  });
}

export function clearAuthCookies(response: NextResponse) {
  for (const cookieName of [ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME]) {
    response.cookies.set({
      name: cookieName,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureCookie(),
      path: "/",
      maxAge: 0,
    });
  }
}
