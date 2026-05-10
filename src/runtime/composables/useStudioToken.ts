import { ref } from "vue";

// Singleton state - we only store a boolean now, the real token is in the secure cookie!
const isAuthenticated = ref(false);

/**
 *
 */
export function useStudioToken() {
  /**
   * Checks the server to see if a valid secure session cookie exists
   */
  const checkAuth = async () => {
    try {
      // Adjust this URL to match your exact endpoint path
      const res = await $fetch<{ isAuthenticated: boolean }>(
        "/api/__i18n_studio/auth/verify_token",
      );
      isAuthenticated.value = res.isAuthenticated;
    } catch {
      isAuthenticated.value = false;
    }
  };

  /**
   * Sends the token to the server to be verified and encrypted into a cookie
   * @param token
   */
  const login = async (token: string) => {
    try {
      // Adjust this URL to match your exact endpoint path
      await $fetch("/api/__i18n_studio/auth/add_token", {
        method: "POST",
        body: { token },
      });
      isAuthenticated.value = true;
      return true;
    } catch (error) {
      isAuthenticated.value = false;
      throw error; // Let the UI handle the error (e.g., showing "Invalid Token")
    }
  };

  /**
   * Clears the session cookie on the server
   */
  const logout = async () => {
    try {
      // Note: You will need a simple logout endpoint that calls clearUserSession(event)
      await $fetch("/api/__i18n_studio/auth/clear_token", { method: "POST" });
    } catch {
      // Ignore errors on logout
    } finally {
      isAuthenticated.value = false;
    }
  };

  return {
    isAuthenticated,
    checkAuth,
    login,
    logout,
  };
}
