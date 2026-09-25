"use client";

import { motion } from "framer-motion";
import { KeyRound, LogOut } from "lucide-react";
import { useRef, useState } from "react";
import { changePassword, signOut } from "@/app/login/actions";
import { Button, Field, Modal, inputCls } from "@/components/ui/form";
import { useOrgStore, type View } from "@/store/useOrgStore";

const TABS: { id: View; label: string }[] = [
  { id: "map", label: "Map" },
  { id: "org", label: "Org" },
  { id: "tasks", label: "Tasks" },
  { id: "runs", label: "Runs" },
];

export default function TopBar({ email }: { email: string }) {
  const view = useOrgStore((s) => s.view);
  const setView = useOrgStore((s) => s.setView);
  const failing = useOrgStore((s) => s.agents.filter((a) => a.status === "blocked").length);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + TABS.length) % TABS.length;
    setView(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-[60px] items-center justify-between gap-4 px-4">
      <div className="pointer-events-auto flex min-w-0 items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inset-0 rounded-full bg-[#ffb020] blur-[3px]" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-[#ffd36a]" />
        </span>
        <span className="label truncate text-[11px] font-semibold text-white/85">Agent Org Map</span>
      </div>

      <nav role="tablist" aria-label="Views" className="glass pointer-events-auto absolute left-1/2 flex -translate-x-1/2 gap-1 rounded-full p-1">
        {TABS.map((t, i) => {
          const active = view === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              type="button"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setView(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`relative rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
                active ? "text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-b from-[#ff7a3d] to-[#ff4a1a] shadow-[0_0_18px_rgba(255,90,31,0.55)]"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative flex items-center gap-1.5 font-semibold">
                {t.label}
                {t.id === "runs" && failing > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] text-white" aria-label={`${failing} failing`}>
                    {failing}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="pointer-events-auto flex items-center gap-2">
        <span className="hidden truncate font-mono text-[10px] text-white/40 xl:inline">{email}</span>
        <PasswordButton />
        <form action={signOut}>
          <button
            type="submit"
            className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70 hover:text-white"
          >
            <LogOut size={12} /> Sign out
          </button>
        </form>
      </div>
    </header>
  );
}

function PasswordButton() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setPw("");
    setPw2("");
    setError(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return setError("The passwords don't match.");
    setBusy(true);
    const res = await changePassword(pw);
    setBusy(false);
    if (res.error) return setError(res.error);
    close();
    useOrgStore.getState().showToast("Password changed.", "info");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Change password"
        title="Change password"
        className="glass grid h-[30px] w-[30px] place-items-center rounded-full text-white/60 hover:text-white"
      >
        <KeyRound size={13} />
      </button>
      <Modal open={open} title="Change password" onClose={close} width={400}>
        <form onSubmit={save} className="space-y-4">
          <Field label="New password" hint="At least 12 characters.">
            <input type="password" autoComplete="new-password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} required />
          </Field>
          <Field label="Repeat it">
            <input type="password" autoComplete="new-password" className={inputCls} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </Field>
          {error && <p className="text-[12.5px] text-red-300">{error}</p>}
          <div className="flex justify-end">
            <Button tone="primary" type="submit" disabled={busy || !pw}>
              {busy ? "Saving…" : "Change password"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
