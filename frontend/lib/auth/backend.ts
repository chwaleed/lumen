import axios from "axios";

// Docker sets BACKEND_URL to the internal service address; local dev hits the published port.
const DEFAULT_BACKEND_URL = "http://localhost:9000";

type BackendErrorPayload = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

export type BackendApiResponse<TData> = {
  success: boolean;
  // null when the response carried no message; callers supply their own wording.
  message: string | null;
  data: TData | null;
};

export type LoginRequestPayload = {
  email: string;
  password: string;
};

export type SignupRequestPayload = {
  name: string;
  email: string;
  password: string;
};

export type RefreshRequestPayload = {
  refresh_token: string;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type UserResponse = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

type BackendRequestOptions = {
  accessToken?: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

function getBackendUrl() {
  return process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL;
}

const backendClient = axios.create({
  validateStatus: () => true,
  headers: {
    "Content-Type": "application/json",
  },
});

function getFallbackError<TData>(message: string): BackendApiResponse<TData> {
  return {
    success: false,
    message,
    data: null,
  };
}

export async function fetchBackend<TData>(
  path: string,
  options: BackendRequestOptions = {}
): Promise<{
  status: number;
  payload: BackendApiResponse<TData>;
}> {
  try {
    const response = await backendClient.request<BackendErrorPayload>({
      url: `${getBackendUrl()}${path}`,
      method: options.method ?? "GET",
      headers: {
        ...(options.accessToken
          ? {
              Authorization: `Bearer ${options.accessToken}`,
            }
          : {}),
      },
      data: options.body,
    });

    const payload: BackendApiResponse<TData> = {
      // validateStatus lets every status through, so the status must be
      // range-checked here; `>= 200` alone treats a 500 as a success.
      success: response.data?.success ?? (response.status >= 200 && response.status < 300),
      message: response.data?.message || null,
      data: (response.data?.data as TData | null | undefined) ?? null,
    };

    return {
      status: response.status,
      payload,
    };
  } catch {
    return {
      status: 502,
      payload: getFallbackError<TData>("Unable to reach backend service."),
    };
  }
}

export async function postBackendAuth<TData>(
  path: string,
  body: unknown,
  options: Omit<BackendRequestOptions, "method" | "body"> = {}
) {
  return fetchBackend<TData>(path, {
    ...options,
    method: "POST",
    body,
  });
}

/** A binary response from the backend, for endpoints that return bytes. */
export type BackendBinaryResponse = {
  status: number;
  body: ArrayBuffer | null;
  contentType: string | null;
};

/**
 * Fetch bytes rather than JSON.
 *
 * The compile PDF endpoint is the only backend route that does not return the
 * `{success, message, data}` envelope, because wrapping a PDF would mean base64
 * and a decode step before the viewer could open it.
 */
export async function fetchBackendBinary(
  path: string,
  options: Omit<BackendRequestOptions, "body" | "method"> = {}
): Promise<BackendBinaryResponse> {
  try {
    const response = await backendClient.request<ArrayBuffer>({
      url: `${getBackendUrl()}${path}`,
      method: "GET",
      responseType: "arraybuffer",
      headers: {
        ...(options.accessToken
          ? {
              Authorization: `Bearer ${options.accessToken}`,
            }
          : {}),
      },
    });

    return {
      status: response.status,
      body: response.data ?? null,
      contentType: (response.headers["content-type"] as string | undefined) ?? null,
    };
  } catch {
    return { status: 502, body: null, contentType: null };
  }
}
