// api/public-config.js
// Serves the two Supabase values that are already meant to be public
// (the project URL and the publishable/anon key -- safe for the browser,
// protected by RLS on the database side). The admin pages fetch this once
// on load instead of hardcoding it into a static HTML file, since this
// project has no build step to inject env vars at build time.

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || null;

  if (!url || !publishableKey) {
    res.status(500).json({ error: 'Supabase is not configured yet.' });
    return;
  }

  res.status(200).json({ supabaseUrl: url, supabasePublishableKey: publishableKey });
}
