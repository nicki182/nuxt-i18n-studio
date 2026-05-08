import { ref } from "vue";

// Singleton state
const githubToken = ref("");

/**
 *
 */
export function useStudioToken() {
  const loadToken = () => {
    if (typeof localStorage !== "undefined") {
      githubToken.value = localStorage.getItem("i18n-studio-gh-token") || "";
    }
  };

  const saveToken = (newToken: string) => {
    githubToken.value = newToken;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("i18n-studio-gh-token", newToken);
    }
  };

  const clearToken = () => {
    githubToken.value = "";
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("i18n-studio-gh-token");
    }
  };

  return {
    githubToken,
    loadToken,
    saveToken,
    clearToken,
  };
}
