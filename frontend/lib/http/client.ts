import axios from "axios";

type ApiErrorPayload = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

export type ApiResponse<TData> = {
  success: boolean;
  // null when the response carried no message, so each caller can supply its
  // own context-specific wording rather than a generic one.
  message: string | null;
  data: TData | null;
};

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
  validateStatus: () => true,
});

function getFallbackError<TData>(message: string): ApiResponse<TData> {
  return {
    success: false,
    message,
    data: null,
  };
}

export async function requestApi<TData>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<{
  status: number;
  payload: ApiResponse<TData>;
}> {
  try {
    const response = await apiClient.request<ApiErrorPayload>({
      url: path,
      method: options.method ?? "GET",
      data: options.body,
      headers: options.headers,
    });

    return {
      status: response.status,
      payload: {
        // validateStatus lets every status through, so the status must be
        // range-checked here; `>= 200` alone treats a 500 as a success.
        success: response.data?.success ?? (response.status >= 200 && response.status < 300),
        message: response.data?.message || null,
        data: (response.data?.data as TData | null | undefined) ?? null,
      },
    };
  } catch {
    return {
      status: 502,
      payload: getFallbackError<TData>("Unable to reach the service."),
    };
  }
}

export async function postApi<TData>(path: string, body: unknown) {
  return requestApi<TData>(path, {
    method: "POST",
    body,
  });
}
