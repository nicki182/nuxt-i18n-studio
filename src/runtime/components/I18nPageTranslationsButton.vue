<template>
  <div v-if="isStudioMode && isOpen" class="i18n-page-translations-panel">
    <div class="panel-header">
      <h3>Page Translations</h3>
      <button class="close-btn" @click="isOpen = false">✕</button>
    </div>

    <div class="panel-body">
      <p v-if="pageKeys.length === 0" class="empty-state">
        No translations detected on this page.
      </p>

      <ul v-else class="key-list">
        <li v-for="key in pageKeys" :key="key" class="key-item">
          <span class="key-name">{{ key }}</span>
          <button class="edit-btn" @click="triggerEdit(key)">Edit</button>
        </li>
      </ul>
    </div>
  </div>

  <!-- A floating toggle button to open the panel when Studio is active -->
  <button
    v-if="isStudioMode && !isOpen"
    class="i18n-page-translations-toggle"
    @click="isOpen = true"
  >
    View All Page Keys ({{ pageKeys.length }})
  </button>
</template>

<script setup lang="ts">
import { useStudioState } from "../composables/useStudioState";

const { isStudioMode, pageKeys } = useStudioState();

// Local state to toggle just this panel
const isOpen = ref(false);

// We inject the same openModal function you use in I18nEditable!
const openModal =
  inject<
    (
      translations: { key: string; usages: string[] }[],
      el?: HTMLElement,
    ) => void
  >("i18n-open-modal");

const triggerEdit = (key: string) => {
  if (openModal) {
    // We format it exactly how your existing modal expects it.
    // Since it's from the page list, it doesn't have a specific DOM element attached.
    openModal([{ key, usages: ["text"] }]);
  }
};
</script>

<style scoped>
.i18n-page-translations-toggle {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: #1e293b;
  color: white;
  border: 1px solid #334155;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  z-index: 999999;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.i18n-page-translations-panel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 320px;
  max-height: 400px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 999999;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #64748b;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.empty-state {
  padding: 16px;
  text-align: center;
  color: #64748b;
  font-size: 13px;
  margin: 0;
}

.key-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.key-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.key-item:last-child {
  border-bottom: none;
}

.key-name {
  font-size: 13px;
  color: #334155;
  word-break: break-all;
  padding-right: 12px;
}

.edit-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.edit-btn:hover {
  background: #2563eb;
}
</style>
