import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const candidate = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? new URL(requestedNext, request.url) : new URL("/dashboard", request.url);
  const next = candidate.origin === request.nextUrl.origin ? candidate : new URL("/dashboard", request.url);
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(next);
  }
  return NextResponse.redirect(new URL("/login?error=oauth", request.url));
}
