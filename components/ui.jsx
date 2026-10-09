"use client";
import { useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, useInView, animate } from "framer-motion";

export const ease = [0.22, 1, 0.36, 1];

export function Reveal({ children, delay = 0, y = 32, className }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.9, delay, ease }}>
      {children}
    </motion.div>
  );
}

// Button/link that leans toward the cursor
export function Magnetic({ children, className = "", ...p }) {
  const x = useSpring(useMotionValue(0), { stiffness: 200, damping: 15 });
  const y = useSpring(useMotionValue(0), { stiffness: 200, damping: 15 });
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.25);
    y.set((e.clientY - r.top - r.height / 2) * 0.35);
  };
  return (
    <motion.a style={{ x, y }} onMouseMove={move} onMouseLeave={() => { x.set(0); y.set(0); }} className={`btn ${className}`} {...p}>
      {children}
    </motion.a>
  );
}

export function Counter({ to, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.8, ease, onUpdate: (v) => ref.current && (ref.current.textContent = Math.round(v) + suffix) });
    return () => c.stop();
  }, [inView, to, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

// Mouse-tracked spotlight for cards
export const spotlight = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

// True only on desktop-class screens without reduced-motion: gates the scroll-driven 3D sections.
import { useState } from "react";
export function useFx() {
  const [fx, set] = useState(false);
  useEffect(() => {
    const q = matchMedia("(min-width:1024px) and (prefers-reduced-motion:no-preference)");
    const u = () => set(q.matches);
    u(); q.addEventListener("change", u);
    return () => q.removeEventListener("change", u);
  }, []);
  return fx;
}
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
