"use client";
import { useState } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { nav, wa } from "@/data/content";
import { ThemeToggle } from "./Theme";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div style={{ scaleX: bar }} className="h-[2px] origin-left bg-gold" />
      <div className="container-x mt-3">
        <div className="flex items-center justify-between rounded-full border border-fg/10 bg-bg/60 py-2.5 pl-4 pr-2.5 backdrop-blur-xl">
          <a href="#top" className="flex min-w-0 items-center gap-2.5">
            <img src="/favicon.png" alt="" className="h-8 w-8 shrink-0 rounded-full" />
            <span className="whitespace-nowrap font-display text-[17px] leading-none sm:text-lg">Amr Mohamed</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm md:flex">
            {nav.map(([l, h]) => <a key={h} href={h} className="text-muted transition hover:text-fg">{l}</a>)}
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <a href={wa()} target="_blank" rel="noopener noreferrer" className="btn btn-gold hidden !py-2.5 md:inline-flex">Book a call</a>
            <button onClick={() => setOpen(!open)} aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-full border border-fg/15 md:hidden">
              <span className="block h-px w-4 bg-current shadow-[0_5px_0_currentColor,0_-5px_0_currentColor]" />
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mt-2 grid gap-1 rounded-3xl border border-fg/10 bg-bg/90 p-3 backdrop-blur-xl md:hidden">
              {nav.map(([l, h]) => <a key={h} href={h} onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 text-lg hover:bg-fg/5">{l}</a>)}
              <a href={wa()} target="_blank" rel="noopener noreferrer" className="btn btn-gold mt-2 justify-center">Book a call</a>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
