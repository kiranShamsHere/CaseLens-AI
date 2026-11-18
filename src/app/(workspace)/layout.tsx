import { AppShell } from "@/components/layout/AppShell";
import { redirect } from "next/navigation";
import { supabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfig()) redirect("/login?setup=1");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const name = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : user.email ?? "Case worker";
  return <AppShell userId={user.id} userName={name} userEmail={user.email ?? ""}>{children}</AppShell>;
}
