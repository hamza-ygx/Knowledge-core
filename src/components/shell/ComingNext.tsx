"use client";

export default function ComingNext({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="glass max-w-md rounded-2xl px-8 py-7 text-center">
        <div className="label text-[10px] text-[#ff8a4c]">Next step</div>
        <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-white/55">{detail}</p>
      </div>
    </div>
  );
}
