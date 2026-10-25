// Shared bootstrap for the quiz admin pages (same sign-in flow as /admin/dashboard).
// Usage:  const { authedFetch, me, signOut } = await initAdmin();
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export async function initAdmin() {
  const gateText = document.querySelector("#gate p");
  let config;
  try {
    const r = await fetch("/api/public-config");
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Couldn't load configuration.");
    config = d;
  } catch (e) {
    if (gateText) gateText.textContent = e.message || "Couldn't load configuration. Please refresh.";
    throw e;
  }
  const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace("/admin/");
    throw new Error("not signed in");
  }

  async function authedFetch(path, opts = {}) {
    const { data } = await supabase.auth.getSession();
    const s = data && data.session;
    if (!s) {
      window.location.replace("/admin/");
      throw new Error("not signed in");
    }
    const headers = { ...(opts.headers || {}), Authorization: "Bearer " + s.access_token };
    if (opts.body && typeof opts.body !== "string") {
      opts = { ...opts, body: JSON.stringify(opts.body) };
      headers["Content-Type"] = "application/json";
    }
    const resp = await fetch(path, { ...opts, headers });
    if (resp.status === 401) {
      window.location.replace("/admin/");
      throw new Error("session expired");
    }
    return resp;
  }

  /** fetch + parse JSON, throwing an Error with the server's message on failure. */
  async function api(path, opts) {
    const resp = await authedFetch(path, opts);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || `Request failed (${resp.status}).`);
    return data;
  }

  const meResp = await authedFetch("/api/admin/me");
  if (!meResp.ok) {
    window.location.replace("/admin/");
    throw new Error("not authorized");
  }
  const { admin } = await meResp.json();

  document.getElementById("gate").style.display = "none";
  document.getElementById("app").hidden = false;
  document.getElementById("signout-btn")?.addEventListener("click", () => {
    supabase.auth.signOut().finally(() => window.location.replace("/admin/"));
  });

  return { authedFetch, api, me: admin };
}
