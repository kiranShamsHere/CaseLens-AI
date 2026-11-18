import { supabaseConfig } from "@/lib/supabase/config";

export async function GET() {
  return Response.json({ status: "ok", databaseConfigured: Boolean(supabaseConfig()), aiConfigured: Boolean(process.env.GEMINI_API_KEY) });
}
