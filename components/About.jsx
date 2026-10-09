"use client";
import { useFx } from "./ui";
import AboutFlat from "./AboutFlat";
import AboutPan from "./AboutPan";
export default function About() { return useFx() ? <AboutPan /> : <AboutFlat />; }
