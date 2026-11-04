import { createClient } from "./supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://careervue-api.welcos.in";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = json?.detail;
    const message = detail?.message ?? detail ?? json?.message ?? res.statusText;
    const code = detail?.code ?? json?.code ?? (
      res.status === 401 ? "UNAUTHORIZED" :
      res.status === 403 ? "FORBIDDEN" :
      res.status >= 500 ? "SERVER_ERROR" : "REQUEST_FAILED"
    );
    throw new ApiError(
      typeof message === "string" ? message : JSON.stringify(message),
      res.status,
      code,
    );
  }
  return (json?.data ?? json) as T;
}

async function fetchWithRefresh(path: string, options: RequestInit): Promise<Response> {
  const request = async () => {
    const headers = await authHeaders();
    if (options.body instanceof FormData) delete headers["Content-Type"];
    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  };

  let response: Response;
  try {
    response = await request();
  } catch {
    throw new ApiError("Unable to reach the server.", 0, "NETWORK_ERROR");
  }
  if (response.status !== 401) return response;

  const supabase = createClient();
  const { error } = await supabase.auth.refreshSession();
  if (error) return response;
  try {
    return await request();
  } catch {
    throw new ApiError("Unable to reach the server.", 0, "NETWORK_ERROR");
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  return handleResponse<T>(await fetchWithRefresh(path, {}));
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return handleResponse<T>(await fetchWithRefresh(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }));
}

export async function apiPostForm<T>(path: string, body: FormData): Promise<T> {
  return handleResponse<T>(await fetchWithRefresh(path, {
    method: "POST",
    body,
  }));
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return handleResponse<T>(await fetchWithRefresh(path, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }));
}

export async function apiDelete<T>(path: string): Promise<T> {
  return handleResponse<T>(await fetchWithRefresh(path, {
    method: "DELETE",
  }));
}
