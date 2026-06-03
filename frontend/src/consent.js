// ---------------------------------------------------------------------------
// Consent management — Google Consent Mode v2 + Google Analytics / Google Ads
// ---------------------------------------------------------------------------
//
// GDPR approach: gtag.js is loaded, but every storage type starts "denied"
// (Consent Mode v2). Nothing personal is stored/sent until the visitor opts
// in via the cookie banner. The decision is persisted to localStorage and
// re-applied on every page load.
//
// Tracking IDs come from environment variables so they are never hardcoded:
//   VITE_GA_ID   = G-XXXXXXXXXX   (Google Analytics 4 measurement ID)
//   VITE_ADS_ID  = AW-XXXXXXXXXX  (Google Ads conversion / remarketing ID)
// If neither is set (e.g. local dev), the banner still works and gtag calls
// become harmless no-ops.

const STORAGE_KEY = "cookie-consent-v1";
const CONSENT_VERSION = 1;

const GA_ID = (import.meta.env.VITE_GA_ID || "").trim();
const ADS_ID = (import.meta.env.VITE_ADS_ID || "").trim();

const listeners = new Set();
let initialized = false;

// --- gtag plumbing ---------------------------------------------------------

function gtag() {
  // Must push `arguments` itself, not a copy — this is the canonical gtag shim.
  window.dataLayer.push(arguments);
}

// --- persisted decision ----------------------------------------------------

/**
 * Returns the stored consent record, or null if the visitor hasn't decided
 * yet (or the stored version is outdated and should be re-asked).
 */
export function getStoredConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasConsentDecision() {
  return getStoredConsent() !== null;
}

// --- subscription (so the banner can hide itself after a choice) -----------

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  const current = getStoredConsent();
  listeners.forEach((fn) => fn(current));
}

// --- core ------------------------------------------------------------------

/**
 * Boot Consent Mode (all denied) and load gtag.js. Safe to call multiple
 * times; only the first call has an effect.
 */
export function initConsent() {
  if (initialized) return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];

  // Deny everything until the visitor chooses. Granting functionality_storage
  // and security_storage is standard — they are required for the site to work
  // and are not used for tracking/advertising.
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  });

  // Consent Mode v2 best practices while consent is denied.
  gtag("set", "ads_data_redaction", true);
  gtag("set", "url_passthrough", true);

  gtag("js", new Date());

  if (GA_ID) gtag("config", GA_ID);
  if (ADS_ID) gtag("config", ADS_ID);

  // Re-apply a previously stored decision (without re-persisting it).
  const stored = getStoredConsent();
  if (stored) applyConsent(stored, { persist: false });

  // Inject the gtag.js library once. The loader URL only needs one ID;
  // additional IDs are activated via the config() calls above.
  const loaderId = GA_ID || ADS_ID;
  if (loaderId && !document.getElementById("gtag-js")) {
    const s = document.createElement("script");
    s.id = "gtag-js";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${loaderId}`;
    document.head.appendChild(s);
  }
}

/**
 * Push a consent decision to gtag and (optionally) persist it.
 * @param {{statistics:boolean, marketing:boolean}} consent
 */
export function applyConsent(consent, { persist = true } = {}) {
  const statistics = !!consent.statistics;
  const marketing = !!consent.marketing;

  gtag("consent", "update", {
    analytics_storage: statistics ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
  });

  if (persist) {
    const record = {
      version: CONSENT_VERSION,
      statistics,
      marketing,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      /* storage may be blocked; consent still applied for this session */
    }
    notify();
  }
}

// --- banner-facing helpers -------------------------------------------------

export function acceptAll() {
  applyConsent({ statistics: true, marketing: true });
}

export function rejectAll() {
  applyConsent({ statistics: false, marketing: false });
}

export function savePreferences({ statistics, marketing }) {
  applyConsent({ statistics, marketing });
}

/** Fire a Google Ads conversion (no-op until the Ads ID and label are set). */
export function trackAdsConversion(sendTo) {
  if (!ADS_ID || !sendTo) return;
  gtag("event", "conversion", { send_to: sendTo });
}
