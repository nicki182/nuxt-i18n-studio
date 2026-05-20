// ── i18n-studio server middleware ─────────────────────────────────────────────
// Applies to all /api/__i18n_studio/* routes.
// Handles:
//   1. Studio mode guard    — rejects requests if studio isn't active
//   2. CSRF protection      — rejects cross-origin requests
//   3. Rate limiting        — prevents abuse of write endpoints

// ── Rate limit store ──────────────────────────────────────────────────────────
// Simple in-memory map — sufficient for a dev/staging tool.
// Keyed by IP, value is attempt count. Cleared after 60s window.

const updateAttempts = new Map<string, number>();

const RATE_LIMIT = 20; // max requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute window

// ── Write routes that need rate limiting ──────────────────────────────────────
const WRITE_ROUTES = [
  "/api/__i18n_studio/update",
  "/api/__i18n_studio/auth/add_token",
];

export default defineEventHandler((event) => {
  const path = event.path ?? "";

  // Only apply to studio routes
  if (!path.startsWith("/api/__i18n_studio")) return;

  // ── 1. Studio mode guard ────────────────────────────────────────────────────
  // Ensures the studio can never be reached unless explicitly activated
  // via the CLI (which sets I18N_STUDIO_MODE=true)
  if (process.env.I18N_STUDIO_MODE !== "true") {
    throw createError({
      statusCode: 403,
      message: "i18n Studio is not active",
    });
  }

  // ── 2. CSRF protection ──────────────────────────────────────────────────────
  // nuxt-auth-utils uses encrypted HTTP-only cookies which are sent
  // automatically by the browser — including from cross-origin pages.
  // We validate that the request origin matches the host to prevent
  // a malicious third-party page from triggering studio endpoints.
  //
  // Skipped for same-origin requests (no Origin header — e.g. server-to-server)
  const origin = getHeader(event, "origin");
  const host = getHeader(event, "host");

  if (origin && host) {
    // Allow if origin ends with the host (handles http/https and subdomains)
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      throw createError({
        statusCode: 403,
        message: "CSRF check failed",
      });
    }
  }

  // ── 3. Rate limiting (write routes only) ────────────────────────────────────
  if (WRITE_ROUTES.some((route) => path.startsWith(route))) {
    const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
    const key = `i18n-studio:${ip}`;
    const attempts = updateAttempts.get(key) ?? 0;

    if (attempts >= RATE_LIMIT) {
      throw createError({
        statusCode: 429,
        message: "Too many requests — please wait a moment before trying again",
      });
    }

    updateAttempts.set(key, attempts + 1);
    setTimeout(() => updateAttempts.delete(key), RATE_WINDOW_MS);
  }
});
