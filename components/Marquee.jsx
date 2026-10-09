import { words } from "@/data/content";
export default function Marquee() {
  const row = [...words, ...words];
  return (
    <div className="overflow-hidden border-y border-fg/10 py-6" aria-hidden>
      <div className="flex w-max animate-[mq_40s_linear_infinite] gap-10 font-display text-3xl italic text-fg/70 md:text-5xl">
        {row.map((w, i) => <span key={i} className="flex items-center gap-10">{w}<i className="h-2 w-2 rounded-full bg-gold" /></span>)}
      </div>
      <style>{`@keyframes mq{to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}
