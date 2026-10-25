import handler from "@/server/quiz/get.js";
import { adapt } from "@/lib/vercel-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const run = adapt(handler);
export { run as GET, run as POST, run as PUT, run as DELETE, run as OPTIONS };
