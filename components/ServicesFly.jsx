"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { services, stats, wa } from "@/data/content";
import { Counter, clamp } from "./ui";

const Tunnel = dynamic(() => import("./Tunnel"), { ssr: false });
const GAP = 1100, XS = [0, -22, 22, -22]; // depth between gates (px), horizontal offset (vw)

export default function ServicesFly() {
  const root = useRef(), gates = useRef([]), prog = useRef(0), counter = useRef();
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const n = services.length, proxy = { p: 0 };
    const apply = () => {
      const p = proxy.p; prog.current = p;
      gates.current.forEach((el, i) => {
        if (!el) return;
        const ez = -i * GAP + p * n * GAP;               // >0 = already passed the camera
        const o = clamp(ez > 0 ? 1 - ez / 450 : 1 + ez / 1000);
        el.style.opacity = o;
        el.style.pointerEvents = o > 0.6 ? "auto" : "none";
        el.style.transform = `translate(-50%,-50%) translate3d(${XS[i]}vw,0,${ez}px)`;
      });
      if (counter.current) counter.current.textContent = `0${Math.min(n, Math.round(p * n) || 0)} / 0${n}`;
    };
    apply();
    const ctx = gsap.context(() => {
      gsap.to(proxy, { p: 1, ease: "none", onUpdate: apply,
        scrollTrigger: { trigger: root.current, start: "top top", end: `+=${n * 110}%`, pin: true, scrub: 0.45 } });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="services" ref={root} className="relative h-screen overflow-hidden">
      <div className="absolute inset-0"><Tunnel progress={prog} /></div>
      <div className="absolute inset-0" style={{ perspective: 1000 }}>
        <div ref={(e) => (gates.current[0] = e)} className="absolute left-1/2 top-1/2 w-[min(90vw,760px)] text-center">
          <p className="eyebrow mb-4">How I can help</p>
          <h2 className="h2">Tailored expertise for every learning journey.</h2>
          <div className="mt-10 grid grid-cols-4 gap-4">
            {stats.map(([v, s, l]) => <div key={l}><div className="font-display text-5xl text-gold"><Counter to={v} suffix={s} /></div><p className="mt-1 text-xs text-muted">{l}</p></div>)}
          </div>
          <p className="mt-12 text-xs uppercase tracking-[.3em] text-muted">Scroll to fly forward ↓</p>
        </div>
        {services.map((s, i) => (
          <article key={s.t} ref={(e) => (gates.current[i + 1] = e)} className={`card absolute left-1/2 top-1/2 w-[min(90vw,440px)] bg-bg/70 p-8 backdrop-blur-xl ${s.featured ? "border-gold/60" : ""}`}>
            <span className="font-display text-5xl italic text-gold/60">0{i + 1}</span>
            <h3 className="mt-4 font-display text-3xl leading-tight">{s.t}</h3>
            <p className="mt-2 text-xs font-medium uppercase tracking-widest text-gold">{s.s}</p>
            <p className="mt-4 text-sm text-muted">{s.d}</p>
            <ul className="mt-5 space-y-1.5 text-sm">{s.f.map((f) => <li key={f} className="flex gap-3"><span className="text-gold">✓</span>{f}</li>)}</ul>
            <a href={wa(s.msg)} target="_blank" rel="noopener noreferrer" className="btn btn-gold mt-7">{s.cta} →</a>
          </article>
        ))}
      </div>
      <span ref={counter} className="absolute bottom-8 left-8 font-display text-xl italic text-muted">00 / 03</span>
    </section>
  );
}
