export type GeminiFailure = "not_configured" | "invalid_model" | "http_error" | "timeout" | "network_error" | "invalid_response";
export type GeminiResult = { ok: true; text: string } | { ok: false; failure: GeminiFailure; status?: number };
type GeminiRequest = { system: string; prompt: string; maxOutputTokens: number };
type Fetcher = typeof fetch;

function responseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const candidates = (payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates;
  return candidates?.[0]?.content?.parts?.map(part => typeof part.text === "string" ? part.text : "").join("").trim() ?? "";
}

/** Direct server-side Gemini REST call; fetcher injection keeps provider behavior deterministic in tests. */
export async function requestGeminiJSON(request: GeminiRequest, fetcher: Fetcher = fetch): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, failure: "not_configured" };

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(model)) return { ok: false, failure: "invalid_model" };

  try {
    const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: request.maxOutputTokens },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return { ok: false, failure: "http_error", status: response.status };
    let payload: unknown;
    try { payload = await response.json(); } catch { return { ok: false, failure: "invalid_response" }; }
    const text = responseText(payload);
    return text ? { ok: true, text } : { ok: false, failure: "invalid_response" };
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return { ok: false, failure: "timeout" };
    return { ok: false, failure: "network_error" };
  }
}

export function parseGeminiJSON(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch { return null; }
}
