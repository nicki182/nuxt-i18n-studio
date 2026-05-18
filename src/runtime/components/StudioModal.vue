<template>
  <Teleport to="body">
    <div v-if="isOpen" class="i18n-modal-overlay" @click.self="$emit('close')">
      <form class="i18n-modal-card" @submit.prevent="handleSave">
        <h3 class="i18n-modal-header">Edit Translations</h3>

        <div v-for="t in translations" :key="t.key" class="i18n-field-group">
          <label class="i18n-label">
            {{ t.key }}
            <span class="i18n-usage">
              {{ t.usages.map((u) => u.replace("attr:", "")).join(", ") }}
            </span>
          </label>
          <textarea
            v-model="localValues[t.key]"
            class="i18n-input"
            rows="2"
            required
            placeholder="Translation is required..."
          ></textarea>
        </div>

        <div class="i18n-modal-footer">
          <button
            type="button"
            class="i18n-btn-secondary"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button type="submit" class="i18n-btn-primary">Apply Preview</button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean;
  translations?: { key: string; usages: string[] }[];
  initialValues: Record<string, string>;
}
const props = withDefaults(defineProps<Props>(), {
  translations: () => [],
});

const emit = defineEmits(["close", "save"]);
const localValues = computed(() => ({ ...props.initialValues }));

const handleSave = () => {
  emit("save", { ...localValues.value }); // Only emit the values!
};
</script>

<style scoped>
.i18n-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: sans-serif;
}
.i18n-modal-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  width: 28.125rem;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
.i18n-modal-header {
  margin: 0 0 1.25rem 0;
  font-size: 1.25rem;
  color: #111827;
  width: 100%;
}
.i18n-field-group {
  margin-bottom: 1rem;
  width: 100%;
}
.i18n-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  margin-bottom: 6px;
}
.i18n-usage {
  font-weight: 400;
  color: #9ca3af;
  margin-left: 8px;
  width: 100%;
}
.i18n-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  width: 100%;
}
</style>
