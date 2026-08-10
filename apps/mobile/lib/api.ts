import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://careervue.welcos.in";

// In-memory token cache — updated by auth state listener, eliminates per-call getSession() I/O
let _token: string | null = null;

supabase.auth.onAuthStateChange((_, session) => {
  _token = session?.access_token ?? null;
});
supabase.auth.getSession().then(({ data: { session } }) => {
  if (!_token) _token = session?.access_token ?? null;
});

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (_token) h["Authorization"] = `Bearer ${_token}`;
  return h;
}

// GET response cache — avoids redundant round-trips on tab switches / screen re-mounts
const _cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

function _clearCache() { _cache.clear(); }

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = json?.detail ?? json?.message ?? res.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return (json?.data ?? json) as T;
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status !== 401) return res;
  // Token expired — refresh once and retry
  const { data: { session } } = await supabase.auth.refreshSession();
  _token = session?.access_token ?? null;
  return fetch(url, { ...options, headers: authHeaders() });
}

export async function apiGet<T>(path: string): Promise<T> {
  const hit = _cache.get(path);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data as T;
  const data = await handleResponse<T>(
    await fetchWithRetry(`${API_URL}${path}`, { headers: authHeaders() }),
  );
  _cache.set(path, { data, ts: Date.now() });
  return data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const data = await handleResponse<T>(await fetchWithRetry(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }));
  _clearCache(); // data has changed — force fresh fetch next time
  return data;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const data = await handleResponse<T>(await fetchWithRetry(`${API_URL}${path}`, {
    method: "PUT",
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }));
  _clearCache();
  return data;
}
