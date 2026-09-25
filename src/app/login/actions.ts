"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { allowedEmails } from "@/lib/supabase/env";
import { serverSupabase } from "@/lib/supabase/server";

export type LoginState = { error?: string };

const schema = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
});

// One message for every failure, so the form doesn't reveal which emails exist or are allowed.
const FAILED = "Wrong email or password.";

export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
  });
  if (!parsed.success) return { error: FAILED };

  const { email, password } = parsed.data;
  if (!allowedEmails().includes(email)) return { error: FAILED };

  const supabase = await serverSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.status === 429 ? "Too many attempts. Wait a few minutes and try again." : FAILED };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await serverSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}

const newPassword = z.string().min(12, "Use at least 12 characters.").max(200);

export async function changePassword(password: string): Promise<{ error?: string }> {
  const parsed = newPassword.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  const supabase = await serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in again." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  return error ? { error: error.message } : {};
}
