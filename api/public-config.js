// api/public-config.js
// Serves the two Supabase values that are already meant to be public
// (the project URL and the publishable/anon key -- safe for the browser,
// protected by RLS on the database side). The admin pages fetch this once
// on load instead of hardcoding it into a static HTML file, since this
// project has no build step to inject env vars at build time.

import { getEnv } from './lib/env.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');

  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL') || null;
  const publishableKey = getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || null;

  if (!url || !publishableKey) {
    const missing = [
      !url && 'NEXT_PUBLIC_SUPABASE_URL',
      !publishableKey && 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ].filter(Boolean);
    // Named explicitly so a misconfigured .env.local / Vercel env is obvious
    // from the response instead of a bare 500.
    res.status(500).json({
      error: `Missing environment variable(s): ${missing.join(', ')}. Set them in .env.local (and restart the dev server) or in Vercel.`,
    });
    return;
  }

  res.status(200).json({ supabaseUrl: url, supabasePublishableKey: publishableKey });
}
