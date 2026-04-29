<template>
  <div
    class="i18n-studio-freeze"
    @click.capture="handleGlobalBlock"
    @mousedown.capture="handleGlobalBlock"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'

const studioActive = inject<{ value: boolean }>('i18n-studio-active')
const isStudioActive = computed(() => studioActive?.value ?? false)

const handleGlobalBlock = (e: MouseEvent) => {
  if (!isStudioActive.value) return

  // 🕵️ Check if the user clicked an actual editable node
  const target = e.target as HTMLElement
  const isEditable = target.closest('.i18n-studio-node')

  if (!isEditable) {
    // If they clicked the background of the modal or a non-translated button
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    console.log("🛡️ Studio blocked interaction with non-editable element inside Frozen Zone.")
  }
}
</script>
