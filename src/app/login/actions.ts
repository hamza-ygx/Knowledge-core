"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { allowedEmails } from "@/lib/supabase/env";
import { serverSupabase } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

const schema = z.object({ email: z.email().max(200) });

export async function sendMagicLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: String(form.get("email") ?? "").trim().toLowerCase() });
  if (!parsed.success) return { status: "error", message: "Enter a valid email address." };

  const { email } = parsed.data;
  // Same answer whether or not the address is allowed, so the form can't be used to probe the allowlist.
  if (!allowedEmails().includes(email)) return { status: "sent" };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await serverSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: true },
  });
  if (error) return { status: "error", message: "Could not send the link. Try again in a minute." };
  return { status: "sent" };
}

export async function signOut() {
  const supabase = await serverSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
