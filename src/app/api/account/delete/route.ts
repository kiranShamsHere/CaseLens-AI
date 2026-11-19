import { apiError, authorizedClient } from "@/lib/api-utils";
import { deleteAuthenticatedAccount, sameRequestOrigin } from "@/lib/account-deletion";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!sameRequestOrigin(request.url, request.headers.get("origin"))) {
      return Response.json({ error: "This account deletion request could not be verified." }, { status: 403 });
    }
    const { user, response } = await authorizedClient();
    if (response || !user) return response ?? Response.json({ error: "Sign in is required." }, { status: 401 });

    let body: unknown;
    try { body = await request.json(); }
    catch { return Response.json({ error: "Confirm the deletion request and try again." }, { status: 400 }); }
    const confirmation = body && typeof body === "object" ? (body as Record<string, unknown>).confirmation : undefined;
    if (confirmation !== "DELETE") return Response.json({ error: "Type DELETE to confirm permanent account deletion." }, { status: 400 });
    const result = await deleteAuthenticatedAccount(user.id, confirmation, createAdminClient());
    if (result.error) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error, "The account could not be deleted.");
  }
}
