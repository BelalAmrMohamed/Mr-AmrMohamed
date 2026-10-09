"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { credentials, timeline } from "@/data/content";

// About effect: a horizontal gallery. Panels slide sideways along X and swing in 3D (rotateY / depth) as they pass center.
export default function AboutPan() {
  const root = useRef(), panels = useRef([]), bg = useRef(), bar = useRef();
  const N = timeline.length + 1;
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const proxy = { p: 0 };
    const apply = () => {
      const p = proxy.p, cur = p * (N - 1);
      panels.current.forEach((el, i) => {
        if (!el) return;
        const d = i - cur, a = Math.abs(d);
        el.style.opacity = Math.max(0, 1 - a * 0.55);
        el.style.pointerEvents = a < 0.5 ? "auto" : "none";
        el.style.transform = `translate(-50%,-50%) translate3d(${d * 62}vw,0,${-a * 380}px) rotateY(${-d * 38}deg)`;
      });
      bg.current.style.transform = `translate3d(${-p * 55}%,0,0)`;   // slower parallax layer
      bar.current.style.transform = `scaleX(${p})`;
    };
    apply();
    const ctx = gsap.context(() => {
      gsap.to(proxy, { p: 1, ease: "none", onUpdate: apply,
        scrollTrigger: { trigger: root.current, start: "top top", end: `+=${N * 90}%`, pin: true, scrub: 0.8 } });
    }, root);
    return () => ctx.revert();
  }, [N]);

  return (
    <section id="about" ref={root} className="relative h-screen overflow-hidden border-t border-fg/10 bg-fg/[.02]">
      <div ref={bg} aria-hidden className="absolute left-[6%] top-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[34vw] italic leading-none text-transparent [-webkit-text-stroke:1px_rgb(var(--fg)/.09)]">
        1995 → today · English
      </div>
      <div className="absolute inset-0" style={{ perspective: 1200 }}>
        <div ref={(e) => (panels.current[0] = e)} className="absolute left-1/2 top-1/2 w-[min(90vw,620px)]">
          <p className="eyebrow mb-4">About</p>
          <h2 className="h2">Three decades of educational excellence.</h2>
          <div className="mt-8 space-y-4">
            {credentials.map(([h, t]) => <div key={h} className="border-l-2 border-gold pl-4"><h3 className="font-semibold">{h}</h3><p className="text-sm text-muted">{t}</p></div>)}
          </div>
          <p className="mt-8 text-xs uppercase tracking-[.3em] text-muted">Scroll sideways →</p>
        </div>
        {timeline.map(([y, t, d], i) => (
          <div key={y} ref={(e) => (panels.current[i + 1] = e)} className="card absolute left-1/2 top-1/2 w-[min(90vw,460px)] bg-bg/70 p-10 backdrop-blur-xl">
            <p className="font-display text-6xl italic text-gold">{y}</p>
            <h3 className="mt-5 text-2xl font-semibold">{t}</h3>
            <p className="mt-2 text-muted">{d}</p>
          </div>
        ))}
      </div>
      <div className="absolute bottom-8 left-8 right-28 h-px bg-fg/10"><div ref={bar} className="h-px origin-left bg-gold" /></div>
    </section>
  );
}
