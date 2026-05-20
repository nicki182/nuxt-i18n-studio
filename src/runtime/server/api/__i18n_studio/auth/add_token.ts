export default defineEventHandler(async (event) => {
  const { token } = await readBody(event);

  if (!token || typeof token !== "string") {
    throw createError({ statusCode: 400, message: "Token is required" });
  }

  // Validate token format before hitting GitHub API
  // GitHub PATs start with ghp_, fine-grained with github_pat_
  if (!token.startsWith("ghp_") && !token.startsWith("github_pat_")) {
    throw createError({
      statusCode: 400,
      message: "Invalid token format — must be a GitHub personal access token",
    });
  }

  try {
    const githubUser: { login: string } = await $fetch(
      "https://api.github.com/user",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Nuxt-i18n-Studio",
        },
      },
    );

    await setUserSession(event, {
      user: { login: githubUser.login },
      secure: { githubToken: token },
    });

    return { success: true, login: githubUser.login };
  } catch {
    throw createError({ statusCode: 401, message: "Invalid GitHub Token" });
  }
});
