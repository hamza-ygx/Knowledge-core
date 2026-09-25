"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <p className="mt-6 rounded-lg border border-[#ffb020]/30 bg-[#ffb020]/[0.07] px-4 py-3 text-[13px] leading-relaxed text-white/80">
        If that address has access, a sign-in link is on its way. Open it on this device.
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-3">
      <label className="block">
        <span className="label text-[10px] text-white/45">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:border-[#ff5a1f]/70 focus:outline-none"
          placeholder="you@company.com"
        />
      </label>
      {state.status === "error" && <p className="text-[12.5px] text-red-300">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gradient-to-b from-[#ff7a3d] to-[#ff4a1a] px-4 py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-black shadow-[0_0_20px_rgba(255,90,31,0.4)] disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send sign-in link"}
      </button>
    </form>
  );
}
