<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast">
        <p>{{ $t('toast.message') }}</p>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const visible = ref(false)

// Show on mount, auto-hide after 3s (unless frozen)
onMounted(() => {
  visible.value = true
  setTimeout(() => {
    visible.value = false
  }, 3000)
})
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #333;
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  z-index: 1000;
  font-family: sans-serif;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
