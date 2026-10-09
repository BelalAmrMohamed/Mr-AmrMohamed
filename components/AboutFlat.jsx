"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { credentials, timeline } from "@/data/content";
import { Reveal } from "./ui";

export default function About() {
  const root = useRef(null);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(".tl-line", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".tl", start: "top 70%", end: "bottom 70%", scrub: true } });
      gsap.utils.toArray(".tl-item").forEach((el) =>
        gsap.from(el, { opacity: 0.15, x: 30, scrollTrigger: { trigger: el, start: "top 80%", end: "top 55%", scrub: true } }));
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section id="about" ref={root} className="border-t border-fg/10 bg-fg/[.02] py-28 md:py-40">
      <div className="container-x grid gap-16 lg:grid-cols-2">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Reveal>
            <p className="eyebrow mb-4">About</p>
            <h2 className="h2">Three decades of educational excellence.</h2>
            <p className="mt-6 max-w-md text-lg text-muted">Since 1995 I have helped students and educators reach exceptional English. My journey spans continents, curricula and countless success stories.</p>
          </Reveal>
          <div className="mt-10 space-y-6">
            {credentials.map(([h, p]) => (
              <Reveal key={h}><div className="border-l-2 border-gold pl-5"><h3 className="font-semibold">{h}</h3><p className="mt-1 text-sm text-muted">{p}</p></div></Reveal>
            ))}
          </div>
        </div>
        <div className="tl relative pl-10">
          <div className="absolute bottom-0 left-[7px] top-2 w-px bg-fg/10" />
          <div className="tl-line absolute bottom-0 left-[7px] top-2 w-px origin-top bg-gold" />
          {timeline.map(([y, t, d]) => (
            <div key={y} className="tl-item relative pb-20 last:pb-0">
              <span className="absolute -left-10 top-2 h-[15px] w-[15px] rounded-full border-2 border-gold bg-bg" />
              <p className="font-display text-4xl italic text-gold">{y}</p>
              <h3 className="mt-2 text-xl font-semibold">{t}</h3>
              <p className="mt-1 text-muted">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
