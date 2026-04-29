<template>
  <Teleport to="body">
    <div v-if="isOpen" class="i18n-modal-overlay" @click.self="$emit('close')">
      <div class="i18n-modal-card">
        <h3 class="i18n-modal-header">Edit Translations</h3>

        <div v-for="t in translations" :key="t.key" class="i18n-field-group">
          <label class="i18n-label">
            {{ t.key }}
            <span class="i18n-usage">
              {{ t.usages.map(u => u.replace('attr:', '')).join(', ') }}
            </span>
          </label>
          <textarea v-model="localValues[t.key]" class="i18n-input" rows="2"></textarea>
        </div>

        <div class="i18n-modal-footer">
          <button @click="$emit('close')" class="i18n-btn-secondary">Cancel</button>
          <button @click="handleSave" class="i18n-btn-primary">Apply Preview</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  translations: { type: Array, default: () => [] },  // { key, usages[] }
  initialValues: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['close', 'save'])

const localValues = reactive({})

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    Object.keys(localValues).forEach(k => delete localValues[k])
    Object.assign(localValues, props.initialValues)
  }
})

const handleSave = () => emit('save', { ...localValues })
</script>

<style scoped>
.i18n-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999999;
  display: flex; align-items: center; justify-content: center; font-family: sans-serif;
}
.i18n-modal-card {
  background: white; padding: 24px; border-radius: 12px; width: 450px;
}
.i18n-modal-header {
  margin: 0 0 20px 0; font-size: 1.25rem; color: #111827;
}
.i18n-field-group { margin-bottom: 16px; }
.i18n-label {
  display: block; font-size: 12px; font-weight: 700; color: #6b7280; margin-bottom: 6px;
}
.i18n-usage {
  font-weight: 400; color: #9ca3af; margin-left: 8px;
}
.i18n-input {
  width: 100%; border: 1px solid #d1d5db; border-radius: 8px;
  padding: 10px; font-family: inherit; font-size: 14px;
}
.i18n-modal-footer {
  display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;
}
.i18n-btn-primary {
  background: #2563eb; color: white; border: none; padding: 10px 20px;
  border-radius: 6px; cursor: pointer; font-weight: 600;
}
.i18n-btn-secondary {
  background: white; border: 1px solid #d1d5db; padding: 10px 20px;
  border-radius: 6px; cursor: pointer;
}
</style>
