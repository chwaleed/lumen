import { NextResponse, type NextRequest } from "next/server";
import { postBackendAuth, type TokenPair } from "@/lib/auth/backend";
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME, applyAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";
import { isJwtExpired } from "@/lib/auth/jwt";

const AUTH_ROUTES = new Set(["/login", "/signup"]);

function isProtectedRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/templates") ||
    pathname.startsWith("/project/")
  );
}

async function refreshSession(refreshToken: string) {
  const result = await postBackendAuth<TokenPair>("/auth/refresh", {
    refresh_token: refreshToken,
  });

  return result.payload.success && result.payload.data ? result.payload.data : null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedRoute(pathname) && !AUTH_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value;
  const accessTokenExpired = accessToken ? isJwtExpired(accessToken) : false;
  const shouldRefreshSession = Boolean(refreshToken) && (!accessToken || accessTokenExpired);

  if (shouldRefreshSession && refreshToken) {
    const tokenPair = await refreshSession(refreshToken);

    if (tokenPair) {
      const response =
        pathname === "/" || AUTH_ROUTES.has(pathname)
          ? NextResponse.redirect(new URL("/dashboard", request.url))
          : NextResponse.next();

      applyAuthCookies(response, tokenPair);
      return response;
    }

    const response = isProtectedRoute(pathname) ? NextResponse.redirect(new URL("/login", request.url)) : NextResponse.next();
    clearAuthCookies(response);
    return response;
  }

  if (accessTokenExpired) {
    const response = isProtectedRoute(pathname) ? NextResponse.redirect(new URL("/login", request.url)) : NextResponse.next();
    clearAuthCookies(response);
    return response;
  }

  if (accessToken) {
    if (pathname === "/" || AUTH_ROUTES.has(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  if (isProtectedRoute(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/signup", "/dashboard/:path*", "/projects/:path*", "/templates/:path*", "/project/:path*"],
};
