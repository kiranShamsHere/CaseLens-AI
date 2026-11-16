import { api } from "@/components/api";

const CACHE_PREFIX = "caselens-cache-v1:";
const REVIEW_QUEUE_KEY = "caselens-review-queue-v1";
const REVIEW_QUEUE_EVENT = "caselens-review-queue-change";
const CACHE_TTL = 14 * 24 * 60 * 60 * 1000;

export type PendingReviewAction = {
  id: string;
  findingId: string;
  decision: string;
  notes: string;
  createdAt: number;
};

let flushPromise: Promise<PendingReviewAction[]> | null = null;

function storageAvailable() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function writeOfflineCache<T>(key: string, value: T) {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Storage can be disabled or full. The live workspace remains usable.
  }
}

export function readOfflineCache<T>(key: string): T | null {
  if (!storageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: unknown; value?: T };
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > CACHE_TTL) {
      window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
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
    const parsed: unknown = JSON.parse(window.localStorage.getItem(REVIEW_QUEUE_KEY) || "[]");
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
    window.localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(queue));
    publishQueueChange();
    return true;
  } catch {
    return false;
  }
}

export function flushPendingReviewActions(): Promise<PendingReviewAction[]> {
  if (!storageAvailable() || !navigator.onLine) return Promise.resolve([]);
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    const synced: PendingReviewAction[] = [];
    for (const action of readPendingReviewActions()) {
      if (!navigator.onLine) break;
      try {
        await api<unknown>("/api/review", {
          method: "POST",
          headers: { "Idempotency-Key": action.id },
          body: JSON.stringify({ findingId: action.findingId, decision: action.decision, notes: action.notes, requestId: action.id }),
        });
        const remaining = readPendingReviewActions().filter(item => item.id !== action.id);
        window.localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(remaining));
        synced.push(action);
        publishQueueChange();
      } catch {
        // Stop at the first failure to preserve decision order and avoid a retry storm.
        break;
      }
    }
    return synced;
  })().finally(() => { flushPromise = null; });
  return flushPromise;
}
