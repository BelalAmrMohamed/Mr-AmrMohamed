"use client";
import { useState } from "react";
import { VIDEO, wa } from "@/data/content";
import { Reveal, Magnetic } from "./ui";

// Click-to-load facade: no YouTube JS until the visitor asks for it.
export default function Lesson() {
  const [play, setPlay] = useState(false);
  return (
    <section id="lesson" className="container-x py-28 md:py-40">
      <Reveal className="mb-12 max-w-2xl"><p className="eyebrow mb-4">Sample lesson</p><h2 className="h2">See my teaching in action.</h2></Reveal>
      <Reveal>
        <div className="card aspect-video">
          {play ? (
            <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${VIDEO}?autoplay=1&rel=0`} title="Sample English lesson by Amr Mohamed Ahmed" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          ) : (
            <button onClick={() => setPlay(true)} aria-label="Play sample lesson" className="group relative h-full w-full">
              <img src={`https://i.ytimg.com/vi/${VIDEO}/hqdefault.jpg`} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <span className="absolute inset-0 bg-bg/40" />
              <span className="absolute left-1/2 top-1/2 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold text-bg transition group-hover:scale-110">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </button>
          )}
        </div>
      </Reveal>
      <Reveal className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-md text-muted">Like what you see? Let's talk about how I can help you reach your English goals.</p>
        <Magnetic href={wa("Hello Mr. Amr, I watched your sample lesson and I'd like to learn more")} target="_blank" rel="noopener noreferrer" className="btn-gold">Start your journey →</Magnetic>
      </Reveal>
    </section>
  );
}
