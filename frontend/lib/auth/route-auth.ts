import { NextResponse } from "next/server";
import {
  fetchBackend,
  fetchBackendBinary,
  postBackendAuth,
  type BackendApiResponse,
  type BackendBinaryResponse,
  type TokenPair,
} from "@/lib/auth/backend";
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME, applyAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";

type RouteRequest = Request;

type BackendAuthedResult<TData> = {
  status: number;
  payload: BackendApiResponse<TData>;
  refreshedTokenPair: TokenPair | null;
  shouldClearCookies: boolean;
};

type BackendAuthedOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

function getCookieValue(request: RouteRequest, cookieName: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
}

export async function fetchBackendWithAuth<TData>(
  request: RouteRequest,
  path: string,
  options: BackendAuthedOptions = {}
): Promise<BackendAuthedResult<TData>> {
  const accessToken = getCookieValue(request, ACCESS_TOKEN_COOKIE_NAME);
  const refreshToken = getCookieValue(request, REFRESH_TOKEN_COOKIE_NAME);

  const executeRequest = (token?: string) =>
    fetchBackend<TData>(path, {
      method: options.method,
      body: options.body,
      accessToken: token,
    });

  let result = await executeRequest(accessToken);
  let refreshedTokenPair: TokenPair | null = null;

  if ((result.status === 401 || result.status === 403) && refreshToken) {
    const refreshResult = await postBackendAuth<TokenPair>("/auth/refresh", {
      refresh_token: refreshToken,
    });

    if (refreshResult.payload.success && refreshResult.payload.data) {
      refreshedTokenPair = refreshResult.payload.data;
      result = await executeRequest(refreshedTokenPair.access_token);
    } else {
      return {
        status: refreshResult.status,
        payload: refreshResult.payload as BackendApiResponse<TData>,
        refreshedTokenPair: null,
        shouldClearCookies: true,
      };
    }
  }

  const shouldClearCookies = result.status === 401;

  return {
    status: result.status,
    payload: result.payload,
    refreshedTokenPair,
    shouldClearCookies,
  };
}

export function applyBackendAuthResult<TData>(
  request: RouteRequest,
  result: BackendAuthedResult<TData>
) {
  const response = NextResponse.json(result.payload, { status: result.status });

  if (result.refreshedTokenPair) {
    applyAuthCookies(response, result.refreshedTokenPair, request);
  }

  if (result.shouldClearCookies) {
    clearAuthCookies(response, request);
  }

  return response;
}

type BackendBinaryResult = BackendBinaryResponse & {
  refreshedTokenPair: TokenPair | null;
  shouldClearCookies: boolean;
};

/**
 * The binary twin of `fetchBackendWithAuth`.
 *
 * It repeats the refresh-on-401 dance rather than adding a mode flag to the JSON
 * helper: the two return different shapes, and one function returning either is
 * harder to read than two that each do one thing.
 */
export async function fetchBackendBinaryWithAuth(
  request: RouteRequest,
  path: string
): Promise<BackendBinaryResult> {
  const accessToken = getCookieValue(request, ACCESS_TOKEN_COOKIE_NAME);
  const refreshToken = getCookieValue(request, REFRESH_TOKEN_COOKIE_NAME);

  let result = await fetchBackendBinary(path, { accessToken });
  let refreshedTokenPair: TokenPair | null = null;

  if ((result.status === 401 || result.status === 403) && refreshToken) {
    const refreshResult = await postBackendAuth<TokenPair>("/auth/refresh", {
      refresh_token: refreshToken,
    });

    if (refreshResult.payload.success && refreshResult.payload.data) {
      refreshedTokenPair = refreshResult.payload.data;
      result = await fetchBackendBinary(path, {
        accessToken: refreshedTokenPair.access_token,
      });
    } else {
      return {
        status: refreshResult.status,
        body: null,
        contentType: null,
        refreshedTokenPair: null,
        shouldClearCookies: true,
      };
    }
  }

  return {
    ...result,
    refreshedTokenPair,
    shouldClearCookies: result.status === 401,
  };
}

export function applyBackendBinaryResult(
  request: RouteRequest,
  result: BackendBinaryResult
) {
  if (!result.body || result.status < 200 || result.status >= 300) {
    const response = NextResponse.json(
      { success: false, message: "Compile output is not available.", data: null },
      { status: result.status === 200 ? 404 : result.status }
    );
    if (result.shouldClearCookies) {
      clearAuthCookies(response, request);
    }
    return response;
  }

  const response = new NextResponse(result.body, {
    status: result.status,
    headers: {
      "Content-Type": result.contentType ?? "application/pdf",
      // The job id is in the path and a finished job's output never changes, so
      // the browser may keep it; a new compile is a new id.
      "Cache-Control": "private, max-age=3600",
    },
  });

  if (result.refreshedTokenPair) {
    applyAuthCookies(response, result.refreshedTokenPair, request);
  }

  return response;
}
