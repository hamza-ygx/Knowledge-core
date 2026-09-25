"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13.5px] text-white placeholder:text-white/30 focus:border-[#ff5a1f]/70 focus:outline-none";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label text-[10px] text-white/45">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-white/35">{hint}</span>}
    </label>
  );
}

export function Button({
  children,
  tone = "ghost",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary:
      "bg-gradient-to-b from-[#ff7a3d] to-[#ff4a1a] text-black shadow-[0_0_16px_rgba(255,90,31,0.35)] hover:shadow-[0_0_22px_rgba(255,90,31,0.55)]",
    ghost: "border border-white/12 bg-white/[0.03] text-white/75 hover:border-white/25 hover:text-white",
    danger: "border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20",
  }[tone];
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-[box-shadow,background,border-color,color] disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  width = 460,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>("input, textarea, select, button:not([data-close])");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
  }, [open]);

  if (!mounted) return null;
  // Portal to <body> so dialogs always sit above panels and drawers.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="glass w-full rounded-2xl"
            style={{ maxWidth: width }}
            initial={{ y: 12, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <h2 className="text-[16px] font-semibold text-white">{title}</h2>
              <button
                type="button"
                data-close
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="scroll-thin max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

