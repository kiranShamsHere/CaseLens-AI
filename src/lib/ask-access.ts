import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type AuthResult = { supabase: SupabaseClient; user: { id: string } | null; response: Response | null };

/** Shared auth gate used by Ask; permits unit testing auth failure without live Supabase credentials. */
export function askAuthFailure(user: AuthResult["user"], response: Response | null): Response | null {
  if (response) return response;
  return user ? null : Response.json({ error: "Sign in is required." }, { status: 401 });
}

/** Read the selected row through the caller's session; RLS hides cases owned by another account. */
export async function selectedAskCase(supabase: SupabaseClient, caseId: string, userId: string) {
  return supabase.from("cases").select("*").eq("id", caseId).eq("owner_id", userId).maybeSingle();
}
