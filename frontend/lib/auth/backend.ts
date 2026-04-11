const DEFAULT_BACKEND_URL = "http://backend:9000";

type BackendErrorPayload = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

export type BackendApiResponse<TData> = {
  success: boolean;
  message: string;
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

type PostBackendAuthOptions = {
  accessToken?: string;
};

function getBackendUrl() {
  return process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL;
}

function getFallbackError<TData>(message: string): BackendApiResponse<TData> {
  return {
    success: false,
    message,
    data: null,
  };
}

export async function postBackendAuth<TData>(
  path: string,
  body: unknown,
  options: PostBackendAuthOptions = {}
): Promise<{
  status: number;
  payload: BackendApiResponse<TData>;
}> {
  try {
    const response = await fetch(`${getBackendUrl()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.accessToken
          ? {
              Authorization: `Bearer ${options.accessToken}`,
            }
          : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const rawPayload = (await response.json().catch(() => null)) as BackendErrorPayload | null;
    const payload: BackendApiResponse<TData> = {
      success: rawPayload?.success ?? response.ok,
      message: rawPayload?.message ?? "Request completed.",
      data: (rawPayload?.data as TData | null | undefined) ?? null,
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
