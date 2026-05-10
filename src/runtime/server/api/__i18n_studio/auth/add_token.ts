export default defineEventHandler(async (event) => {
  const { token } = await readBody(event);

  if (!token) {
    throw createError({ statusCode: 400, message: "Token is required" });
  }

  try {
    // Verify the token with GitHub
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

    // Encrypt and save token to http-only cookie using nuxt-auth-utils
    await setUserSession(event, {
      user: { login: githubUser.login },
      secure: { githubToken: token }, // Kept in secure payload so it never hits the client
    });

    return { success: true };
  } catch {
    throw createError({ statusCode: 401, message: "Invalid GitHub Token" });
  }
});
