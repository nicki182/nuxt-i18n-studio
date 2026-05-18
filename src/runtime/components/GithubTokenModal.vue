<template>
  <Teleport to="body">
    <div v-if="isOpen" class="i18n-token-overlay">
      <form class="i18n-token-card" @submit.prevent="handleSubmit">
        <div class="i18n-icon-wrapper">
          <svg height="32" viewBox="0 0 16 16" width="32" fill="currentColor">
            <path
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            ></path>
          </svg>
        </div>

        <h3 class="i18n-modal-header">GitHub Token Required</h3>

        <p class="i18n-modal-description">
          To save translations and create Pull Requests on your behalf, please
          provide a GitHub Personal Access Token (classic) with
          <strong>repo</strong> permissions.
        </p>

        <div class="i18n-field-group">
          <label class="i18n-label">Personal Access Token</label>
          <input
            v-model="githubToken"
            type="password"
            class="i18n-input"
            :class="{ 'i18n-input-error': errorMessage }"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            required
            :disabled="isVerifying"
          />

          <!-- Error Message Display -->
          <p v-if="errorMessage" class="i18n-error-text">
            {{ errorMessage }}
          </p>
        </div>

        <div class="i18n-modal-footer">
          <button
            type="submit"
            class="i18n-btn-primary"
            :disabled="!githubToken || isVerifying"
          >
            <!-- Show text based on loading state -->
            {{ isVerifying ? "Verifying Token..." : "Authenticate & Continue" }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean;
  isVerifying?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  (e: "submit", token: string): void;
}>();

const githubToken = computed({
  get: () => "",
  set: (value: string) => {
    githubToken.value = value.trim();
  },
});

const handleSubmit = () => {
  if (githubToken.value && !props.isVerifying) {
    emit("submit", githubToken.value);
  }
};
</script>

<style scoped>
.i18n-token-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(4px);
  z-index: 9999999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: sans-serif;
}

.i18n-token-card {
  background: white;
  padding: 32px;
  border-radius: 12px;
  width: 420px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  text-align: center;
}

.i18n-icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
  color: #1f2937;
}

.i18n-modal-header {
  margin: 0 0 12px 0;
  font-size: 1.5rem;
  color: #111827;
}

.i18n-modal-description {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.5;
  margin-bottom: 24px;
}

.i18n-field-group {
  margin-bottom: 24px;
  text-align: left;
}

.i18n-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.i18n-input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 12px;
  font-family: monospace;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.i18n-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.i18n-input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
  color: #9ca3af;
}

.i18n-input-error {
  border-color: #ef4444;
}

.i18n-input-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.i18n-error-text {
  margin-top: 8px;
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
  margin-bottom: 0;
}

.i18n-modal-footer {
  display: flex;
  justify-content: center;
}

.i18n-btn-primary {
  width: 100%;
  background: #111827;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: background-color 0.2s;
}

.i18n-btn-primary:hover:not(:disabled) {
  background: #1f2937;
}

.i18n-btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
</style>
