import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Agent Org Map" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="noise relative grid h-dvh place-items-center overflow-hidden bg-[#07070a] px-4">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,120,30,0.18), rgba(255,60,20,0.05) 45%, transparent 70%)" }}
      />
      <div className="glass relative w-full max-w-sm rounded-2xl px-7 py-8">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-[#ffb020] blur-[3px]" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-[#ffd36a]" />
          </span>
          <span className="label text-[11px] font-semibold text-white/85">Agent Org Map</span>
        </div>
        <h1 className="mt-5 text-[22px] font-semibold text-white">Sign in</h1>
        <p className="mt-1 text-[13px] text-white/55">We&apos;ll email you a one-time sign-in link.</p>
        {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">That link didn&apos;t work. Request a new one.</p>}
        <LoginForm />
      </div>
    </main>
  );
}
