const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(typeof FormData !== "undefined" && init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

/** Read a backend collection without combining it with demo records. */
export async function apiCollection<T>(path: string, field: string): Promise<T[] | null> {
  try {
    const result = await api<unknown>(path);
    if (Array.isArray(result)) return result as T[];
    if (result && typeof result === "object") {
      const payload = result as Record<string, unknown>;
      if (Array.isArray(payload[field])) return payload[field] as T[];
      if (Array.isArray(payload.data)) return payload.data as T[];
    }
    return null;
  } catch {
    return null;
  }
}
