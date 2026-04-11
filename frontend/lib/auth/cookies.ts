import { NextResponse } from "next/server";
import type { TokenPair } from "@/lib/auth/backend";

export const ACCESS_TOKEN_COOKIE_NAME = "lumen_access_token";
export const REFRESH_TOKEN_COOKIE_NAME = "lumen_refresh_token";

type RequestWithHeaders = {
  headers: Headers;
  url: string;
};

function shouldUseSecureCookies(request: RequestWithHeaders) {
  // Temporary local/server HTTP bypass:
  // keep auth cookies non-secure until SSL and the final domain are configured.
  // Once HTTPS is enabled, replace this early return with the protocol-based
  // check below so cookies are marked Secure in production traffic.
  return false;

  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }

  return new URL(request.url).protocol === "https:";
}

function getRefreshTokenMaxAge() {
  const refreshTokenExpireDays = Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS ?? "7");
  const safeExpireDays = Number.isFinite(refreshTokenExpireDays) && refreshTokenExpireDays > 0 ? refreshTokenExpireDays : 7;
  return safeExpireDays * 24 * 60 * 60;
}

export function applyAuthCookies(
  response: NextResponse,
  tokenPair: TokenPair,
  request: RequestWithHeaders
) {
  const secure = shouldUseSecureCookies(request);

  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE_NAME,
    value: tokenPair.access_token,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: tokenPair.expires_in,
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE_NAME,
    value: tokenPair.refresh_token,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: getRefreshTokenMaxAge(),
  });
}

export function clearAuthCookies(response: NextResponse, request: RequestWithHeaders) {
  const secure = shouldUseSecureCookies(request);

  for (const cookieName of [ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME]) {
    response.cookies.set({
      name: cookieName,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0,
    });
  }
}
