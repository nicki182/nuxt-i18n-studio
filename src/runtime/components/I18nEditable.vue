<script lang="ts">
import { defineComponent, cloneVNode, inject, type VNode, ref, onMounted, onUnmounted, watch } from 'vue'

export default defineComponent({
  name: 'I18nEditable',
  props: {
    translationKey: { type: String, required: true }
  },
  setup(props, { slots }) {
    const isStudioActive = inject<{ value: boolean }>('i18n-studio-active')
    const openModal = inject<Function>('i18n-open-modal')

    // We use a ref to grab the actual raw HTML element once it mounts
    const elRef = ref<HTMLElement | null>(null)

    // The Ultimate Event Blocker
    const blockAndOpen = (e: Event) => {
      if (!isStudioActive?.value) return

      // 🛑 The "Wall": Kill the event immediately in the capture phase
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      // We block mousedown/up/submit, but we only open the modal on 'click'
      if (e.type === 'click') {
        openModal?.(props.translationKey.split(','), e.currentTarget as HTMLElement)
      }
    }

    // Attach or remove native listeners
    const toggleListeners = (add: boolean) => {
      const el = elRef.value
      if (!el) return

      const method = add ? 'addEventListener' : 'removeEventListener'
      // THIS is the magic bullet: { capture: true } ensures we run first
      const opts = { capture: true }

      el[method]('click', blockAndOpen, opts)
      el[method]('mousedown', blockAndOpen, opts)
      el[method]('mouseup', blockAndOpen, opts)
      el[method]('submit', blockAndOpen, opts)
    }

    // Watch for Studio Mode toggling (Ctrl+Shift+F)
    watch(() => isStudioActive?.value, (active) => {
      toggleListeners(!!active)
    })

    // Handle initial mount
    onMounted(() => {
      if (isStudioActive?.value) toggleListeners(true)
    })

    // Clean up when the component is destroyed
    onUnmounted(() => toggleListeners(false))

    return () => {
      const children = slots.default?.()
      if (!children || children.length === 0) return null

      const vnode = children.find(n => n.type !== Symbol.for('v-fgt') && n.type !== Symbol.for('v-cmt')) as VNode
      if (!vnode) return children

      return cloneVNode(vnode, {
        ref: elRef, // 👈 Bind the DOM element to our ref
        'data-i18n-key': props.translationKey,
        class: [vnode.props?.class, 'i18n-studio-node'],
      })
    }
  }
})
</script>

<style>
/* Visual feedback for editable nodes */
.i18n-studio-active .i18n-studio-node {
  outline: 1px dashed rgba(59, 130, 246, 0.4) !important;
  cursor: context-menu !important;
  /* Prevent text highlighting while clicking */
  user-select: none !important;
}

.i18n-studio-active .i18n-studio-node:hover {
  outline: 2px solid #3b82f6 !important;
  background: rgba(59, 130, 246, 0.05) !important;
}
</style>
