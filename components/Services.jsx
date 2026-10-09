"use client";
import { useFx } from "./ui";
import ServicesFlat from "./ServicesFlat";
import ServicesFly from "./ServicesFly";
export default function Services() { return useFx() ? <ServicesFly /> : <ServicesFlat />; }
