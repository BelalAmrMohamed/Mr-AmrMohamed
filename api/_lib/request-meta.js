// api/lib/request-meta.js
// Pulls geo + device info out of a Vercel request without any dependency.
// Vercel automatically adds geo headers at the edge for every request.

export function getGeo(req) {
  const h = req.headers || {};
  return {
    country: h['x-vercel-ip-country'] || null,
    city: h['x-vercel-ip-city'] ? decodeURIComponent(h['x-vercel-ip-city']) : null,
  };
}

export function getClientIp(req) {
  const h = req.headers || {};
  const fwd = h['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || null;
}

/** Very small, dependency-free UA sniffing — good enough for a dashboard chart. */
export function parseUserAgent(uaRaw) {
  const ua = uaRaw || '';
  let deviceType = 'desktop';
  if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';
  else if (/mobile|android|iphone/i.test(ua)) deviceType = 'mobile';

  let browser = 'Other';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) browser = 'Safari';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';

  let os = 'Other';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ios/i.test(ua)) os = 'iOS';
  else if (/mac os|macintosh/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  return { deviceType, browser, os };
}
