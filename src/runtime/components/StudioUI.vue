<template>
  <!-- We use fragments since we are rendering multiple root elements -->
  <StudioModal
    :is-open="modalState.open"
    :translations="modalState.translations"
    :target-element="modalState.targetElement"
    :initial-values="modalState.initialValues"
    @close="closeStudioModal"
    @save="handleSave"
  />

  <StudioSaveBar
    :count="Object.keys(pendingChanges).length"
    :loading="isPublishing"
    :initial-clear-locales="config.cleanOnValueChange"
    :is-publishing-to-github="!isDev"
    @publish="handlePublish"
  />

  <I18nPageTranslations />

  <GithubTokenModal
    :is-open="isTokenModalOpen"
    :is-verifying="isVerifying"
    :error-message="tokenError"
    @close="isTokenModalOpen = false"
    @submit="saveTokenAndPublish"
  />
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick } from "vue";

import type { I18nInstance } from "../types/i18n";

import { useStudioEffects } from "../composables/useStudioEffects";
import { useStudioState } from "../composables/useStudioState";
import { useStudioToken } from "../composables/useStudioToken";
import { updateJSON } from "../utils/updateJSON";
// Components
import GithubTokenModal from "./GithubTokenModal.vue";
import I18nPageTranslations from "./I18nPageTranslationsButton.vue";
import StudioModal from "./StudioModal.vue";
import StudioSaveBar from "./StudioSaveBar.vue";

const nuxtApp = useNuxtApp();
const config = useRuntimeConfig().public.i18nStudio || {};
const isDev = import.meta.dev;

// ── State ───────────────────────────────────────────────────────────────────
// modalState is shared globally because the directive needs to open it
const { modalState, closeStudioModal, pendingChanges } = useStudioState();

// The rest of the state is strictly local to this detached Studio UI app.
// It doesn't need to be a global singleton because the main app doesn't need it.
const isPublishing = ref(false);
const isTokenModalOpen = ref(false);
const clearOtherLocales = ref(false);
const isVerifying = ref(false);
const tokenError = ref("");

// ── Composables ─────────────────────────────────────────────────────────────
const { isAuthenticated, checkAuth, login, logout } = useStudioToken();
const { checkHmrAttached, markHmrAttached } = useStudioEffects(() => {
  // Use the shared action to ensure the 'closed' event is broadcast on HMR
  closeStudioModal();
  isTokenModalOpen.value = false;
});

// ── Logic ───────────────────────────────────────────────────────────────────

/**
 * Handles local save (updates vue-i18n in-memory)
 */
const handleSave = (newTranslations: Record<string, string>) => {
  Object.assign(pendingChanges.value, newTranslations);

  const i18n = nuxtApp.$i18n as I18nInstance | undefined;
  if (!i18n) return;

  const currentLocale = i18n.locale?.value || "en";
  let updatedMessages = { ...i18n.getLocaleMessage(currentLocale) };

  Object.entries(newTranslations).forEach(([key, val]) => {
    const result = updateJSON(updatedMessages, key, val, config.isFlatJson);
    if (result) updatedMessages = result;
  });

  i18n.mergeLocaleMessage(currentLocale, updatedMessages);

  // 🔔 Use the shared action to close and broadcast the 'closed' event to the main app
  closeStudioModal();
};

/**
 * Verifies token and triggers publish
 */
const saveTokenAndPublish = async (token: string) => {
  isVerifying.value = true;
  tokenError.value = "";

  try {
    await login(token);
    isTokenModalOpen.value = false;
    handlePublish(clearOtherLocales.value);
  } catch (err) {
    console.error(err);
    tokenError.value = "Invalid GitHub Token. Please check your token and try again.";
  } finally {
    isVerifying.value = false;
  }
};

/**
 * Persists changes to locale files via server API
 */
async function handlePublish(clearLocales: boolean) {
  if (!isAuthenticated.value && !import.meta.dev) {
    clearOtherLocales.value = clearLocales;
    isTokenModalOpen.value = true;
    return;
  }

  isPublishing.value = true;
  const changesToApply = { ...pendingChanges.value };
  const i18n = nuxtApp.$i18n as I18nInstance | undefined;
  const currentLocale = i18n?.locale?.value || "en";

  try {
    const response = await $fetch<{
      success: boolean;
      json?: Record<string, unknown>;
    }>("/api/__i18n_studio/update", {
      method: "POST",
      body: {
        updates: changesToApply,
        locale: currentLocale,
        clearOtherLocales: clearLocales,
      },
    });

    if (response.success && response.json && i18n) {
      i18n.setLocaleMessage(currentLocale, response.json);

      // HMR Refresh Logic
      const hmrHandler = () => {
        if (i18n && response.json) {
          i18n.setLocaleMessage(currentLocale, response.json);
          const temp = i18n.locale.value;
          i18n.locale.value = "";
          nextTick(() => {
            i18n.locale.value = temp;
          });
        }
      };

      if (import.meta.hot && !checkHmrAttached()) {
        markHmrAttached();
        import.meta.hot.on("vite:afterUpdate", hmrHandler);
        // FIX: Removed the vite:beforeUpdate cleanup.
        // Removing the listener right before the update fires was breaking the HMR refresh.
      }
    }

    pendingChanges.value = {};
  } catch (err: any) {
    console.error("Publish failed:", err);

    if (err.response?.status === 401) {
      logout();
      tokenError.value = "Your GitHub token session expired. Please authenticate again.";
      isTokenModalOpen.value = true;
    } else {
      // Consider replacing this with a toast notification in the future
      alert("Failed to publish changes. Check console for details.");
    }
  } finally {
    isPublishing.value = false;
  }
}

// ── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(() => {
  if (!import.meta.dev) checkAuth();
});
</script>
