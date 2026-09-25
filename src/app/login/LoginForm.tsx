"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:border-[#ff5a1f]/70 focus:outline-none";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <form action={action} className="mt-6 space-y-3">
      <label className="block">
        <span className="label text-[10px] text-white/45">Email</span>
        <input name="email" type="email" required autoComplete="username" autoFocus className={inputCls} placeholder="you@company.com" />
      </label>
      <label className="block">
        <span className="label text-[10px] text-white/45">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
      </label>
      {state.error && (
        <p role="alert" className="text-[12.5px] text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gradient-to-b from-[#ff7a3d] to-[#ff4a1a] px-4 py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-black shadow-[0_0_20px_rgba(255,90,31,0.4)] disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
