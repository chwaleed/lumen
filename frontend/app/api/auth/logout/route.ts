import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME, clearAuthCookies } from "@/lib/auth/cookies";
import { postBackendAuth } from "@/lib/auth/backend";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieMap = new Map(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=");
        return [part.slice(0, separatorIndex), part.slice(separatorIndex + 1)];
      })
  );

  const accessToken = cookieMap.get(ACCESS_TOKEN_COOKIE_NAME);
  const refreshToken = cookieMap.get(REFRESH_TOKEN_COOKIE_NAME);

  if (accessToken && refreshToken) {
    await postBackendAuth(
      "/auth/logout",
      {
        refresh_token: refreshToken,
      },
      {
        accessToken,
      }
    );
  }

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully.",
  });

  clearAuthCookies(response, request);
  return response;
}
