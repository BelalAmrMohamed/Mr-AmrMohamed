"use client";
import { services, stats, wa } from "@/data/content";
import { Reveal, Counter, spotlight } from "./ui";

export default function Services() {
  return (
    <section id="services" className="container-x py-28 md:py-40">
      <div className="mb-16 grid grid-cols-2 gap-6 md:grid-cols-4">
        {stats.map(([n, s, l]) => (
          <Reveal key={l}><div className="font-display text-6xl text-gold md:text-7xl"><Counter to={n} suffix={s} /></div><p className="mt-2 text-sm text-muted">{l}</p></Reveal>
        ))}
      </div>
      <Reveal><p className="eyebrow mb-4">How I can help</p><h2 className="h2 max-w-2xl">Tailored expertise for every learning journey.</h2></Reveal>
      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {services.map((s, i) => (
          <Reveal key={s.t} delay={i * 0.1}>
            <article onMouseMove={spotlight} className={`card spot flex h-full flex-col p-8 ${s.featured ? "border-gold/50 bg-gold/[.07]" : ""}`}>
              {s.featured && <span className="absolute right-6 top-6 rounded-full bg-gold px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-bg">Most popular</span>}
              <span className="font-display text-5xl italic text-gold/60">0{i + 1}</span>
              <h3 className="mt-6 font-display text-3xl leading-tight">{s.t}</h3>
              <p className="mt-2 text-xs font-medium uppercase tracking-widest text-gold">{s.s}</p>
              <p className="mt-5 text-muted">{s.d}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {s.f.map((f) => <li key={f} className="flex gap-3"><span className="text-gold">✓</span>{f}</li>)}
              </ul>
              <a href={wa(s.msg)} target="_blank" rel="noopener noreferrer" className="group mt-auto inline-flex items-center gap-2 pt-8 font-semibold">
                {s.cta}<span className="transition-transform group-hover:translate-x-1.5">→</span>
              </a>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
