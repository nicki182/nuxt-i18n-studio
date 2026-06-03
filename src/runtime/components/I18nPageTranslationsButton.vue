<template>
  <div v-if="isStudioMode && isOpen" class="i18n-page-translations-panel">
    <div class="panel-header">
      <h3>Page Translations</h3>
      <button class="close-btn" @click="isOpen = false">✕</button>
    </div>

    <div class="panel-search">
      <input
        v-model="search"
        class="search-input"
        placeholder="Filter keys..."
        type="text"
      />
    </div>

    <div class="panel-body">
      <p v-if="filteredKeys.length === 0" class="empty-state">
        {{ pageKeys.length === 0 ? "No translations detected on this page." : "No keys match your filter." }}
      </p>

      <ul v-else class="key-list">
        <li v-for="key in filteredKeys" :key="key" class="key-item">
          <span class="key-name">{{ key }}</span>
          <button class="edit-btn" @click="triggerEdit(key)">Edit</button>
        </li>
      </ul>
    </div>

    <div class="panel-footer">
      {{ filteredKeys.length }} / {{ pageKeys.length }} keys
    </div>
  </div>

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

const isOpen = ref(false);
const search = ref("");

const filteredKeys = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return pageKeys.value;
  return pageKeys.value.filter((key) => key.toLowerCase().includes(q));
});

// Reset search when panel is closed
watch(isOpen, (val) => {
  if (!val) search.value = "";
});

const openModal =
  inject<
    (
      translations: { key: string; usages: string[] }[],
      el?: HTMLElement,
    ) => void
  >("i18n-open-modal");

const triggerEdit = (key: string) => {
  if (openModal) {
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
  max-height: 480px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 999999;
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
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

.panel-search {
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  color: #0f172a;
  background: #f8fafc;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: #3b82f6;
  background: #ffffff;
}

.search-input::placeholder {
  color: #94a3b8;
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
  flex-shrink: 0;
  transition: background 0.2s;
}

.edit-btn:hover {
  background: #2563eb;
}

.panel-footer {
  padding: 8px 16px;
  border-top: 1px solid #e2e8f0;
  font-size: 12px;
  color: #94a3b8;
  text-align: right;
  flex-shrink: 0;
  background: #f8fafc;
}
</style>
