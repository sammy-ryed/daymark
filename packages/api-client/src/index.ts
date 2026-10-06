export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export function createApi(options: {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
}) {
  return async function api<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await options.getToken?.();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await fetch(`${options.baseUrl}${path}`, {
        ...init,
        credentials: options.getToken ? "omit" : "include",
        headers: {
          "Content-Type": "application/json",
          "X-Project-Client": options.getToken ? "mobile" : "web",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
        signal: init.signal ?? controller.signal,
      });
    } catch {
      throw new ApiError(
        "Cannot reach the server. Check your connection and try again.",
        0,
      );
    } finally {
      clearTimeout(timeout);
    }
    if (response.status === 204) return undefined as T;
    const data = await response.json().catch(() => ({
      message: "The server returned an unexpected response.",
    }));
    if (!response.ok) {
      if (
        response.status === 401 &&
        !path.startsWith("/auth/login") &&
        !path.startsWith("/auth/register")
      )
        options.onUnauthorized?.();
      throw new ApiError(
        data?.message ?? "Something went wrong. Please try again.",
        response.status,
        data?.fields,
      );
    }
    return data as T;
  };
}
