import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME, applyAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";
import { postBackendAuth, type TokenPair } from "@/lib/auth/backend";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const refreshToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`))
    ?.slice(`${REFRESH_TOKEN_COOKIE_NAME}=`.length);

  if (!refreshToken) {
    const response = NextResponse.json(
      {
        success: false,
        message: "Refresh token is missing.",
      },
      { status: 401 }
    );
    clearAuthCookies(response);
    return response;
  }

  const { status, payload } = await postBackendAuth<TokenPair>("/auth/refresh", {
    refresh_token: refreshToken,
  });

  if (!payload.success || !payload.data) {
    const response = NextResponse.json(payload, { status });
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json(
    {
      success: true,
      message: payload.message,
    },
    { status }
  );

  response.cookies.delete(ACCESS_TOKEN_COOKIE_NAME);
  applyAuthCookies(response, payload.data);
  return response;
}
