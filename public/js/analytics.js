// public/js/analytics.js
// Lightweight, privacy-respecting visitor tracking for the teacher's live
// dashboard. No cookies used for identity, no third-party script, no PII:
// just a random ID kept in this browser's localStorage so we can count
// unique visitors and whether someone is currently on the site.
//
// Sends:
//  - one "pageview" beacon per page load
//  - a "heartbeat" every 20s while the tab is visible, so the dashboard's
//    "live now" count stays accurate
'use strict';

(function () {
  const VISITOR_KEY = 'mrAmr.visitorId';
  const SESSION_KEY = 'mrAmr.sessionId';
  const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min of inactivity -> new session
  const HEARTBEAT_MS = 20 * 1000;

  function randomId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID().replace(/-/g, '');
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function getVisitorId() {
    try {
      let id = localStorage.getItem(VISITOR_KEY);
      if (!id) {
        id = randomId();
        localStorage.setItem(VISITOR_KEY, id);
      }
      return id;
    } catch {
      return randomId();
    }
  }

  function getSessionId() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      const now = Date.now();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (now - parsed.ts < SESSION_TTL_MS) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: parsed.id, ts: now }));
          return parsed.id;
        }
      }
      const id = randomId();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, ts: now }));
      return id;
    } catch {
      return randomId();
    }
  }

  function isInstalledPwa() {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  const visitorId = getVisitorId();

  function send(path, body) {
    const payload = JSON.stringify({ visitorId, ...body });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      const ok = navigator.sendBeacon(path, blob);
      if (ok) return;
    }
    fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }

  function trackPageview() {
    send('/api/track', {
      type: 'pageview',
      sessionId: getSessionId(),
      path: location.pathname + location.hash,
      referrer: document.referrer || null,
      isInstalledPwa: isInstalledPwa(),
    });
  }

  function heartbeat() {
    if (document.visibilityState !== 'visible') return;
    send('/api/track', {
      type: 'heartbeat',
      sessionId: getSessionId(),
      path: location.pathname + location.hash,
    });
  }

  // Public, minimal API other scripts (e.g. the AI assistant) can use to
  // report events without knowing about visitor/session IDs themselves.
  window.mrAmrAnalytics = {
    visitorId,
    trackAiEvent(eventType, extra = {}) {
      send('/api/event', { kind: 'ai', eventType, ...extra });
    },
    trackContactClick(method, source = 'site') {
      send('/api/event', { kind: 'contact', method, source });
    },
  };

  // Automatically detect clicks on contact links anywhere on the page
  // (WhatsApp/Telegram/email/LinkedIn) so the dashboard can show which
  // contact methods actually get used — no manual wiring needed per link.
  function detectContactMethod(href) {
    if (!href) return null;
    if (href.includes('wa.me') || href.includes('whatsapp')) return 'whatsapp';
    if (href.includes('t.me')) return 'telegram';
    if (href.startsWith('mailto:')) return 'email';
    if (href.includes('linkedin.com')) return 'linkedin';
    return null;
  }

  document.addEventListener(
    'click',
    (event) => {
      const link = event.target.closest?.('a[href]');
      if (!link) return;
      const method = detectContactMethod(link.getAttribute('href'));
      if (method) window.mrAmrAnalytics.trackContactClick(method, 'site');
    },
    true
  );

  trackPageview();
  heartbeat();
  setInterval(heartbeat, HEARTBEAT_MS);

  // Re-send a pageview when navigating within an SPA-like hash change, and
  // a final heartbeat right before the tab closes so "live" drops promptly.
  window.addEventListener('hashchange', trackPageview);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') heartbeat();
  });
})();
