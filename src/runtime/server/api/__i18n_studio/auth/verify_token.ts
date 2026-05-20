export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const token = session.secure?.githubToken;

  if (!token) {
    return { isAuthenticated: false };
  }

  // Optionally verify the token is still valid against GitHub
  // Only do this on explicit verify calls, not on every request
  try {
    await $fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "Nuxt-i18n-Studio",
      },
    });
    return { isAuthenticated: true };
  } catch {
    // Token expired or revoked — clear the session
    await clearUserSession(event);
    return { isAuthenticated: false, reason: "token_expired" };
  }
});
