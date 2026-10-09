// api/admin/diag.js
// A tiny, no-secrets-leaked diagnostic endpoint for local/dev debugging of
// env var resolution. Visit /api/admin/diag in the browser or curl it --
// it reports which required vars are present WITHOUT ever returning their
// values, so it's safe to leave deployed but is mainly meant for figuring
// out mismatches between .env.local and Vercel's pulled environment
// (e.g. a var scoped to "Production" only, which vercel dev won't see
// when running in Development mode).

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const report = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    VERCEL_ENV: process.env.VERCEL_ENV || '(not set -- likely vercel dev / local)',
    NODE_ENV: process.env.NODE_ENV || null,
  };

  const allRequiredPresent =
    report.NEXT_PUBLIC_SUPABASE_URL &&
    report.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    report.SUPABASE_SERVICE_ROLE_KEY;

  res.status(200).json({
    ok: allRequiredPresent,
    message: allRequiredPresent
      ? 'All required Supabase env vars are present in this running process.'
      : 'One or more required env vars are missing from this running process. ' +
        'If they look correct in .env.local or Vercel\'s dashboard but show false ' +
        'here, check: (1) was the dev server restarted after the var was added, ' +
        'and (2) in Vercel -> Settings -> Environment Variables, is the var scoped ' +
        'to include "Development" (vercel dev pulls Development by default), not ' +
        'just "Production"?',
    vars: report,
  });
}
