type AccountAdmin = {
  auth: { admin: { deleteUser: (userId: string) => Promise<{ error: { message: string } | null }> } };
};

export async function deleteAuthenticatedAccount(userId: string | null | undefined, confirmation: unknown, admin: AccountAdmin) {
  if (!userId) return { status: 401, error: "Sign in is required." } as const;
  if (confirmation !== "DELETE") return { status: 400, error: "Type DELETE to confirm permanent account deletion." } as const;
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { status: 500, error: "The account could not be deleted. Please try again or contact support." } as const;
  return { status: 200, error: null } as const;
}

export function sameRequestOrigin(requestUrl: string, origin: string | null) {
  if (!origin) return false;
  try { return new URL(requestUrl).origin === new URL(origin).origin; }
  catch { return false; }
}
