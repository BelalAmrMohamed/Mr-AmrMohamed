// Runs the existing Vercel-style handlers (export default (req, res) => ...) as Next.js route handlers,
// so every handler in /server works unchanged on `next dev`, `next start` and Vercel.
export function adapt(handler) {
  return async function run(request) {
    const headers = Object.fromEntries(request.headers);
    const url = new URL(request.url);
    let body;
    if (!["GET", "HEAD"].includes(request.method)) {
      const text = await request.text();
      try { body = (headers["content-type"] || "").includes("json") && text ? JSON.parse(text) : text; } catch { body = text; }
    }
    const req = {
      method: request.method, headers, body, query: Object.fromEntries(url.searchParams), url: url.pathname + url.search,
      socket: { remoteAddress: (headers["x-forwarded-for"] || "").split(",")[0].trim() || null },
    };
    return new Promise((resolve) => {
      let status = 200, done = false;
      const h = new Headers();
      const finish = (data) => { if (!done) { done = true; resolve(new Response(data ?? null, { status, headers: h })); } };
      const res = {
        status(c) { status = c; return res; },
        setHeader(k, v) { h.set(k, Array.isArray(v) ? v.join(", ") : String(v)); return res; },
        getHeader: (k) => h.get(k),
        json(o) { h.set("Content-Type", "application/json"); finish(JSON.stringify(o)); return res; },
        send(d) { finish(typeof d === "object" && d !== null ? JSON.stringify(d) : d); return res; },
        end(d) { finish(d); return res; },
      };
      Promise.resolve(handler(req, res)).then(() => finish(null)).catch((e) => {
        console.error("[api]", e);
        status = 500; h.set("Content-Type", "application/json"); finish(JSON.stringify({ error: "Internal server error." }));
      });
    });
  };
}
