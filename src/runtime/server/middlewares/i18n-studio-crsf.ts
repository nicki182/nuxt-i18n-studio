// server/middleware/i18n-studio-csrf.ts
export default defineEventHandler((event) => {
  if (!event.path.startsWith("/api/__i18n_studio")) return;

  const origin = getHeader(event, "origin");
  const host = getHeader(event, "host");

  if (origin && !origin.endsWith(host ?? "")) {
    throw createError({ statusCode: 403, message: "CSRF check failed" });
  }
});
