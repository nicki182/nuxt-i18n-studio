<template>
  <Transition name="slide-up">
    <div v-if="count > 0" class="i18n-save-bar">
      <div class="i18n-status">
        <span class="i18n-pulse-dot"></span>
        <span class="i18n-count-text"
          >{{ count }} unsaved change{{ count > 1 ? "s" : "" }}</span
        >
      </div>
      <button
        class="i18n-publish-btn"
        :disabled="loading"
        @click="$emit('publish')"
      >
        {{ loading ? "Saving..." : "Publish to JSON" }}
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  count: number;
  loading: boolean;
}

defineProps<Props>();
defineEmits<{ (e: "publish"): void }>();
</script>

<style scoped>
.i18n-save-bar {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #111827;
  color: white;
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 999998;
  font-family: sans-serif;
}
.i18n-status {
  display: flex;
  align-items: center;
  gap: 10px;
}
.i18n-pulse-dot {
  width: 8px;
  height: 8px;
  background: #fbbf24;
  border-radius: 50%;
  animation: pulse 2s infinite;
}
.i18n-count-text {
  font-size: 14px;
  font-weight: 500;
}
.i18n-publish-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.i18n-publish-btn:hover:not(:disabled) {
  background: #059669;
}
.i18n-publish-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(251, 191, 36, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
  }
}
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100px);
  opacity: 0;
}
</style>
