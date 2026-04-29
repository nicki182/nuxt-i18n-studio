import { render } from 'vue'
import StudioModal from '../components/StudioModal.vue'
import StudioSaveBar from '../components/StudioSaveBar.vue'

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return

  // ── STUDIO MODE STATE ─────────────────────────────────────
  const isStudioMode = ref(false)

  const setTimerPause = (pause: boolean) => {
    const win = window as any
    if (pause) {
      // Cancel all real timeouts so existing timers won't fire
      win.__i18nCancelAllTimers?.()
      console.log('⏸️  i18n Studio: Timers paused', win.__i18nTimerPatchDone ? '(patched)' : '(not patched)')
    }
    win.__i18nStudioMode = pause
    if (!pause) {
      // When unfreezing, run & discard any queued timeouts
      win.__i18nFlushTimers?.()
    }
  }

  // ── PENDING CHANGES & MODAL STATE ─────────────────────────
  const pendingChanges = ref<Record<string, string>>({})
  const isPublishing = ref(false)

  const modalState = reactive({
    open: false,
    translations: [] as { key: string; usages: string[] }[],
    targetElement: null as HTMLElement | null,
    initialValues: {} as Record<string, string>,
  })

  // ── PROVIDE FOR I18N EDITABLE ─────────────────────────────
  nuxtApp.vueApp.provide('i18n-studio-active', isStudioMode)
  nuxtApp.vueApp.provide('i18n-open-modal',
    (translations: { key: string; usages: string[] }[], el: HTMLElement) => {
      modalState.translations = translations
      modalState.targetElement = el

      const i18n = (nuxtApp as any).$i18n
      const currentLocale = i18n?.locale?.value || 'en'
      const messages = i18n?.getLocaleMessage?.(currentLocale) || {}

      const initials: Record<string, string> = {}
      translations.forEach(t => {
        let currentVal = ''
        try {
          currentVal = t.key.split('.').reduce((o: any, k: string) => o?.[k], messages) || ''
        } catch {}
        t.usages.forEach(u => {
          if (u === 'text') {
            const domVal = el.textContent?.trim()
            if (domVal) currentVal = domVal
            return
          } else if (u.startsWith('attr:')) {
            const attrName = u.slice(5)
            const domVal = el.getAttribute(attrName)
            if (domVal) currentVal = domVal
            return
          }
        })
        initials[t.key] = pendingChanges.value[t.key] ?? currentVal
      })
      modalState.initialValues = initials
      modalState.open = true
    }
  )

  // ── MOUNT REACTIVE UI ─────────────────────────────────────
  const studioRoot = document.createElement('div')
  studioRoot.id = 'i18n-studio-ui-root'
  document.body.appendChild(studioRoot)

  const StudioUI = defineComponent({
    setup() {
      const handleSave = (vals: Record<string, string>) => {
        Object.assign(pendingChanges.value, vals)
        const el = modalState.targetElement
        if (!el) return
        modalState.translations.forEach(t => {
          const newVal = vals[t.key] ?? ''
          t.usages.forEach(u => {
            if (u === 'text') {
              el.textContent = newVal
            } else if (u.startsWith('attr:')) {
              const attrName = u.slice(5)
              el.setAttribute(attrName, String(newVal))
            }
          })
        })
        modalState.open = false
      }

      return () => [
        h(StudioModal, {
          isOpen: modalState.open,
          translations: modalState.translations,
          targetElement: modalState.targetElement,
          initialValues: modalState.initialValues,
          onClose: () => { modalState.open = false },
          onSave: handleSave,
        }),
        h(StudioSaveBar, {
          count: Object.keys(pendingChanges.value).length,
          loading: isPublishing.value,
          onPublish: handlePublish,
        }),
      ]
    }
  })

  render(h(StudioUI), studioRoot)

  // ── PUBLISH (WITH HMR) ────────────────────────────────────
  async function handlePublish() {
    isPublishing.value = true;
    const changesToApply = { ...pendingChanges.value };
    const i18n = (nuxtApp as any).$i18n;
    const currentLocale = i18n?.locale?.value || "en";

    try {
      const response = await $fetch("/api/__i18n_studio/update", {
        method: "POST",
        body: { updates: changesToApply, locale: currentLocale },
      });
      if (response.success && response.json) {
        i18n.mergeLocaleMessage(currentLocale, response.json);
        const hmrHandler = () => {
          console.log("Applying native i18n sync with JSON:", response.json);
          i18n.mergeLocaleMessage(currentLocale, response.json);
          const temp = i18n.locale.value;
          i18n.locale.value = "";
          nextTick(() => {
            i18n.locale.value = temp;
          });
        };
        if (
          import.meta.hot &&
          !(window as any).__i18n_hmr_attached &&
          response.success &&
          response.json
        ) {
          (window as any).__i18n_hmr_attached = true;
          import.meta.hot.on("vite:afterUpdate", hmrHandler);
        }
      }
      pendingChanges.value = {};
    } catch (err) {
      console.error("Publish failed:", err);
    } finally {
      isPublishing.value = false;
    }
  }

  // ── GLOBAL TOGGLE (Ctrl+Shift+F) ──────────────────────────
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      e.stopPropagation()
      isStudioMode.value = !isStudioMode.value

      setTimerPause(isStudioMode.value)

      if (isStudioMode.value) {
        document.body.classList.add('i18n-studio-active')
        document.documentElement.classList.add('i18n-frozen')
      } else {
        document.body.classList.remove('i18n-studio-active')
        document.documentElement.classList.remove('i18n-frozen')
        modalState.open = false
      }
    }
  })
})
