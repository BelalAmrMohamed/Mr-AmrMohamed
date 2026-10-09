"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { wa } from "@/data/content";
import { Magnetic, ease } from "./ui";

const Scene = dynamic(() => import("./Scene"), { ssr: false });
const lines = ["Fluent futures,", "built by three", "decades of craft."];

export default function Hero() {
  const reduce = useReducedMotion();
  return (
    <section id="top" className="relative flex min-h-[100svh] items-center overflow-hidden pb-16 pt-32">
      {!reduce && <div className="absolute inset-0 opacity-70 md:left-1/4"><Scene /></div>}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_40%,rgb(var(--bg)/.85),transparent)]" />
      <div className="container-x relative grid items-center gap-12 md:grid-cols-[1.3fr_.7fr]">
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="eyebrow mb-6">
            Amr Mohamed Ahmed · AUC Certified Trainer
          </motion.p>
          <h1 className="font-display text-[clamp(2.8rem,8vw,6.5rem)] leading-[.98] tracking-tight">
            {lines.map((l, i) => (
              <span key={l} className="block overflow-hidden pb-2">
                <motion.span className={`block ${i === 2 ? "italic text-gold" : ""}`} initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 1.1, delay: 0.3 + i * 0.12, ease }}>{l}</motion.span>
              </span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }} className="mt-8 max-w-lg text-lg text-muted">
            Empowering students and educators across the Middle East with world-class English language expertise. IELTS, TOEFL, Gulf curricula and teacher training.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.8 }} className="mt-10 flex flex-wrap gap-3">
            <Magnetic href={wa()} target="_blank" rel="noopener noreferrer" className="btn-gold">Schedule free consultation →</Magnetic>
            <Magnetic href="#lesson" className="btn-line">Watch a sample lesson</Magnetic>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 1.2, ease }} className="relative mx-auto w-full max-w-xs md:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-3xl border border-fg/15">
            <Image src="/assets/images/profile.jpg" alt="Amr Mohamed Ahmed" fill priority sizes="(min-width:768px) 30vw, 70vw" className="object-cover" />
          </div>
          <div className="card absolute -bottom-5 -left-4 !rounded-2xl bg-bg/80 px-4 py-3 text-sm backdrop-blur-xl">
            <b className="font-display text-2xl text-gold">32</b> <span className="text-muted">years of excellence</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
