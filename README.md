# Mr. Amr Mohamed: Homepage v2 (Next.js)
`npm i && npm run dev`. Deploy on Vercel (framework preset: Next.js).
- `data/content.js`: all copy, links, WhatsApp number (edit text here, not in components)
- `components/`: Hero, Scene (globe), ServicesFly + Tunnel (fly-forward 3D), AboutPan (horizontal 3D gallery), *Flat versions (mobile / reduced-motion fallbacks), Lesson, Contact, Nav, Theme, SmoothScroll
- `public/`, `server/` (your old `api/` handlers, unchanged), `supabase/`, `vercel.json`: carried over. `app/api/*/route.js` expose each handler at the same /api/... URL via `lib/vercel-adapter.js`
- Copy `.env.example` to `.env.local` and fill in your keys (the AI chat and analytics need them)
- Before deploying, delete the old `public/index.html`, `public/css/` and `public/js/main.js` (still in your repo).
