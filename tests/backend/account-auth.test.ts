import assert from "node:assert/strict";
import { test } from "node:test";
import { deleteAuthenticatedAccount, sameRequestOrigin } from "@/lib/account-deletion";
import { isRecoveryLink, passwordResetRedirectTo, recoverySessionIsValid, recoveryTokenHash, requestPasswordReset, updateRecoveryPassword, validateNewPassword } from "@/lib/auth-recovery";
import { clearOfflineUserData, setOfflineUserScope } from "@/components/offline";

test("password reset requests use dedicated production and localhost URLs", async () => {
  assert.equal(passwordResetRedirectTo("https://caselens-ai-omega.vercel.app"), "https://caselens-ai-omega.vercel.app/reset-password");
  assert.equal(passwordResetRedirectTo("http://localhost:3000"), "http://localhost:3000/reset-password");
  const calls: unknown[] = [];
  const auth = { resetPasswordForEmail: async (...args: unknown[]) => { calls.push(args); return { error: null }; } };
  await requestPasswordReset(auth, " person@example.test ", "http://localhost:3000");
  assert.deepEqual(calls, [["person@example.test", { redirectTo: "http://localhost:3000/reset-password" }]]);
});

test("reset links accept PKCE and recovery token URLs but reject ordinary login URLs", () => {
  assert.equal(isRecoveryLink("https://caselens.test/reset-password?code=pkce-code"), true);
  assert.equal(isRecoveryLink("https://caselens.test/reset-password?token_hash=one-time&type=recovery"), true);
  assert.equal(recoveryTokenHash("https://caselens.test/reset-password?token_hash=one-time&type=recovery"), "one-time");
  assert.equal(isRecoveryLink("https://caselens.test/reset-password#access_token=a&refresh_token=b&type=recovery"), true);
  assert.equal(isRecoveryLink("https://caselens.test/reset-password"), false);
  assert.equal(recoverySessionIsValid({ user: { id: "u-1" } }, true, false), true);
  assert.equal(recoverySessionIsValid(null, true, false), false);
  assert.equal(recoverySessionIsValid({ user: { id: "u-1" } }, false, false), false);
  assert.equal(recoverySessionIsValid({ user: { id: "u-1" } }, false, true), true);
});

test("password reset validates matching values and updates only with a valid session", async () => {
  assert.match(validateNewPassword("short", "short") ?? "", /at least 8/);
  assert.match(validateNewPassword("long-enough", "different") ?? "", /do not match/);
  assert.equal(validateNewPassword("long-enough", "long-enough"), null);
  let updated = "";
  const validAuth = {
    getSession: async () => ({ data: { session: { user: { id: "u-1" } } }, error: null }),
    updateUser: async ({ password }: { password: string }) => { updated = password; return { error: null }; },
  };
  assert.deepEqual(await updateRecoveryPassword(validAuth, "long-enough", "long-enough"), { error: null });
  assert.equal(updated, "long-enough");
  let invalidUpdateCalled = false;
  const expiredAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    updateUser: async () => { invalidUpdateCalled = true; return { error: null }; },
  };
  const expired = await updateRecoveryPassword(expiredAuth, "long-enough", "long-enough");
  assert.match(expired.error ?? "", /expired or is invalid/);
  assert.equal(invalidUpdateCalled, false);
});

test("account deletion rejects unauthenticated and unconfirmed requests and deletes only the signed-in user", async () => {
  const deleted: string[] = [];
  const admin = { auth: { admin: { deleteUser: async (userId: string) => { deleted.push(userId); return { error: null }; } } } };
  assert.equal((await deleteAuthenticatedAccount(null, "DELETE", admin)).status, 401);
  assert.equal((await deleteAuthenticatedAccount("user-1", "delete", admin)).status, 400);
  assert.deepEqual(deleted, []);
  assert.deepEqual(await deleteAuthenticatedAccount("authenticated-user", "DELETE", admin), { status: 200, error: null });
  assert.deepEqual(deleted, ["authenticated-user"]);
  assert.equal(sameRequestOrigin("https://app.test/api/account/delete", "https://app.test"), true);
  assert.equal(sameRequestOrigin("https://app.test/api/account/delete", "https://evil.test"), false);
  assert.equal(sameRequestOrigin("https://app.test/api/account/delete", null), false);
});

test("account deletion clears only that user's local CaseLens cache and review queue", () => {
  const values = new Map<string, string>([
    ["caselens-cache-v1:user-1:case-list", "owned cached case"],
    ["caselens-review-queue-v1:user-1", "owned pending decision"],
    ["caselens-cache-v1:user-2:case-list", "another user's case"],
  ]);
  const fakeStorage = {
    get length() { return values.size; },
    key(index: number) { return [...values.keys()][index] ?? null; },
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
    removeItem(key: string) { values.delete(key); },
    clear() { values.clear(); },
  };
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: fakeStorage } });
  try {
    setOfflineUserScope("user-1");
    clearOfflineUserData("user-1");
    assert.equal(values.has("caselens-cache-v1:user-1:case-list"), false);
    assert.equal(values.has("caselens-review-queue-v1:user-1"), false);
    assert.equal(values.get("caselens-cache-v1:user-2:case-list"), "another user's case");
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
