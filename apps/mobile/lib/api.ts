import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://careervue-api.welcos.in";

// In-memory token cache — updated by auth state listener, eliminates per-call getSession() I/O
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
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

// GET response cache — avoids redundant round-trips on tab switches / screen re-mounts
const _cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

function _clearCache() { _cache.clear(); }

supabase.auth.onAuthStateChange(() => {
  _clearCache();
});

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

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        ...await authHeaders(),
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new ApiError("Unable to reach the server.", 0, "NETWORK_ERROR");
  }
  if (res.status !== 401) return res;
  // Token expired — refresh once and retry
  const { error } = await supabase.auth.refreshSession();
  if (error) return res;
  try {
    return await fetch(url, {
      ...options,
      headers: {
        ...await authHeaders(),
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new ApiError("Unable to reach the server.", 0, "NETWORK_ERROR");
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const hit = _cache.get(path);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data as T;
  const data = await handleResponse<T>(
    await fetchWithRetry(`${API_URL}${path}`, {}),
  );
  _cache.set(path, { data, ts: Date.now() });
  return data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const data = await handleResponse<T>(await fetchWithRetry(`${API_URL}${path}`, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }));
  _clearCache(); // data has changed — force fresh fetch next time
  return data;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const data = await handleResponse<T>(await fetchWithRetry(`${API_URL}${path}`, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }));
  _clearCache();
  return data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const data = await handleResponse<T>(await fetchWithRetry(`${API_URL}${path}`, {
    method: "DELETE",
  }));
  _clearCache();
  return data;
}
