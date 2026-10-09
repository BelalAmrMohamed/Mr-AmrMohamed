"use client";
import { useState } from "react";
import { contacts, wa } from "@/data/content";
import { Reveal, spotlight } from "./ui";

export default function Contact() {
  const [sent, setSent] = useState(false);
  // No backend needed: the form composes a WhatsApp message to Mr. Amr.
  const submit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const text = `Hello Mr. Amr, I'm ${f.name}.${f.service ? `\nInterested in: ${f.service}` : ""}${f.phone ? `\nPhone: ${f.phone}` : ""}\n\n${f.message}`;
    window.open(wa(text), "_blank", "noopener");
    setSent(true);
  };
  return (
    <section id="contact" className="border-t border-fg/10 py-28 md:py-40">
      <div className="container-x grid gap-14 lg:grid-cols-2">
        <Reveal>
          <p className="eyebrow mb-4">Contact</p>
          <h2 className="h2">Ready to start your journey?</h2>
          <div className="mt-10 grid gap-3">
            {contacts.map(([n, v, h]) => (
              <a key={n} href={h} target={h.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" onMouseMove={spotlight} className="card spot group flex items-center justify-between !rounded-2xl px-5 py-4">
                <span><b className="block text-sm">{n}</b><span className="text-sm text-muted">{v}</span></span>
                <span className="text-gold transition-transform group-hover:translate-x-1.5">→</span>
              </a>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <form onSubmit={submit} className="card space-y-4 p-8">
            <h3 className="font-display text-3xl">Send a message</h3>
            <input name="name" required placeholder="Your name" className="field" />
            <div className="grid gap-4 sm:grid-cols-2">
              <input name="phone" type="tel" placeholder="Phone (optional)" className="field" />
              <select name="service" className="field">
                <option value="">I'm interested in…</option>
                {["IELTS preparation", "TOEFL preparation", "K-12 tutoring", "Teacher training", "Other"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <textarea name="message" required rows={5} placeholder="How can I help?" className="field" />
            <button className="btn btn-gold w-full justify-center">{sent ? "Opened in WhatsApp ✓" : "Send via WhatsApp →"}</button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
