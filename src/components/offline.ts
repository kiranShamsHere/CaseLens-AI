import { api } from "@/components/api";

const CACHE_PREFIX = "caselens-cache-v1:";
const REVIEW_QUEUE_PREFIX = "caselens-review-queue-v1:";
const REVIEW_QUEUE_EVENT = "caselens-review-queue-change";
const CACHE_TTL = 14 * 24 * 60 * 60 * 1000;
let userScope = "unscoped";

export function setOfflineUserScope(userId: string) {
  userScope = userId;
}

export function clearOfflineUserData(userId: string) {
  if (!storageAvailable()) return;
  const ownedPrefixes = [`${CACHE_PREFIX}${userId}:`, `${REVIEW_QUEUE_PREFIX}${userId}`];
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index--) {
      const key = window.localStorage.key(index);
      if (key && ownedPrefixes.some(prefix => key.startsWith(prefix))) window.localStorage.removeItem(key);
    }
  } catch {
    // The server deletion remains complete; browser storage may be unavailable.
  }
  if (userScope === userId) userScope = "unscoped";
}

function cacheKey(key: string) { return `${CACHE_PREFIX}${userScope}:${key}`; }
function reviewQueueKey() { return `${REVIEW_QUEUE_PREFIX}${userScope}`; }

export type PendingReviewAction = {
  id: string;
  findingId: string;
  decision: string;
  notes: string;
  createdAt: number;
};

const flushPromises = new Map<string, Promise<PendingReviewAction[]>>();

function storageAvailable() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function writeOfflineCache<T>(key: string, value: T) {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(cacheKey(key), JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Storage can be disabled or full. The live workspace remains usable.
  }
}

export function readOfflineCache<T>(key: string): T | null {
  if (!storageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: unknown; value?: T };
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > CACHE_TTL) {
      window.localStorage.removeItem(cacheKey(key));
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export function readPendingReviewActions(): PendingReviewAction[] {
  if (!storageAvailable()) return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(reviewQueueKey()) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PendingReviewAction => Boolean(
      item && typeof item === "object" &&
      typeof item.id === "string" && typeof item.findingId === "string" &&
      typeof item.decision === "string" && typeof item.notes === "string" &&
      typeof item.createdAt === "number"
    ));
  } catch {
    return [];
  }
}

function publishQueueChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REVIEW_QUEUE_EVENT));
}

export function subscribeReviewQueue(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(REVIEW_QUEUE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(REVIEW_QUEUE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function enqueueReviewAction(action: Omit<PendingReviewAction, "id" | "createdAt">) {
  if (!storageAvailable()) return false;
  const queue = readPendingReviewActions();
  if (queue.some(item => item.findingId === action.findingId)) return false;
  queue.push({ ...action, id: crypto.randomUUID(), createdAt: Date.now() });
  try {
    window.localStorage.setItem(reviewQueueKey(), JSON.stringify(queue));
    publishQueueChange();
    return true;
  } catch {
    return false;
  }
}

export function flushPendingReviewActions(): Promise<PendingReviewAction[]> {
  if (!storageAvailable() || !navigator.onLine) return Promise.resolve([]);
  const scope = userScope;
  const key = `${REVIEW_QUEUE_PREFIX}${scope}`;
  const existing = flushPromises.get(scope);
  if (existing) return existing;
  const flush = (async () => {
    const synced: PendingReviewAction[] = [];
    const readQueue = (): PendingReviewAction[] => {
      try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
        return Array.isArray(parsed) ? parsed.filter((item): item is PendingReviewAction => Boolean(
          item && typeof item === "object" && typeof item.id === "string" &&
          typeof item.findingId === "string" && typeof item.decision === "string" &&
          typeof item.notes === "string" && typeof item.createdAt === "number"
        )) : [];
      } catch { return []; }
    };
    for (const action of readQueue()) {
      if (!navigator.onLine) break;
      try {
        await api<unknown>("/api/review", {
          method: "POST",
          headers: { "Idempotency-Key": action.id },
          body: JSON.stringify({ findingId: action.findingId, decision: action.decision, notes: action.notes, requestId: action.id }),
        });
        const remaining = readQueue().filter(item => item.id !== action.id);
        window.localStorage.setItem(key, JSON.stringify(remaining));
        synced.push(action);
        publishQueueChange();
      } catch {
        // Stop at the first failure to preserve decision order and avoid a retry storm.
        break;
      }
    }
    return synced;
  })().finally(() => { flushPromises.delete(scope); });
  flushPromises.set(scope, flush);
  return flush;
}
