import { NextResponse, type NextRequest } from "next/server";
import { allowedEmails } from "@/lib/supabase/env";
import { serverSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const supabase = await serverSupabase();

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const email = data.user?.email?.toLowerCase();
    if (!error && email && allowedEmails().includes(email)) {
      return NextResponse.redirect(new URL("/", url.origin));
    }
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login?error=1", url.origin));
}
