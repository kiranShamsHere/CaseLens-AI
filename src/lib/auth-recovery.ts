export const recoveryMarkerKey = "caselens-password-recovery";

export function passwordResetRedirectTo(origin: string) {
  return new URL("/reset-password", origin).toString();
}

export function isRecoveryLink(href: string) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  return url.searchParams.has("code") || url.searchParams.has("token_hash") || hash.get("type") === "recovery" || (hash.has("access_token") && hash.has("refresh_token"));
}

export function recoveryTokenHash(href: string) {
  return new URL(href).searchParams.get("token_hash");
}

export function recoverySessionIsValid(session: unknown, recoveryLink: boolean, hasRecoveryMarker: boolean) {
  return Boolean(session && (recoveryLink || hasRecoveryMarker));
}

type ResetEmailAuth = {
  resetPasswordForEmail: (email: string, options: { redirectTo: string }) => Promise<{ error: { message: string } | null }>;
};

export async function requestPasswordReset(auth: ResetEmailAuth, email: string, origin: string) {
  return auth.resetPasswordForEmail(email.trim(), { redirectTo: passwordResetRedirectTo(origin) });
}

export function validateNewPassword(password: string, confirmation: string) {
  if (password.length < 8) return "Use a password with at least 8 characters.";
  if (password !== confirmation) return "The passwords do not match.";
  return null;
}

type RecoveryAuth = {
  getSession: () => Promise<{ data: { session: unknown | null }; error: { message: string } | null }>;
  updateUser: (attributes: { password: string }) => Promise<{ error: { message: string } | null }>;
};

export async function updateRecoveryPassword(auth: RecoveryAuth, password: string, confirmation: string) {
  const validationError = validateNewPassword(password, confirmation);
  if (validationError) return { error: validationError };
  const { data, error: sessionError } = await auth.getSession();
  if (sessionError || !data.session) return { error: "This reset link has expired or is invalid. Request a new password reset link." };
  const { error } = await auth.updateUser({ password });
  return { error: error?.message ?? null };
}
