export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  // Return true if the secure githubToken exists in the session
  return {
    isAuthenticated: !!session.secure?.githubToken,
  };
});
