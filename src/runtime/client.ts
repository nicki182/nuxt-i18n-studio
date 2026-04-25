import { ref } from "vue";
import { updateTranslation } from "./utils/updateTranslation";
function unflattenObject(changes: Record<string, string>) {
  const result: any = {};
  for (const key in changes) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = changes[key];
  }
  return result;
}
export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return;

  const isStudioMode = ref(false);
  const pendingChanges = ref<Record<string, string>>({});
  const modifiedElements = ref<HTMLElement[]>([]);

  // --- 1. GLOBAL CSS ---
  const style = document.createElement("style");
  style.innerHTML = `
    .i18n-studio-active [data-i18n-key] {
      outline: 1px dashed rgba(59, 130, 246, 0.5) !important;
      cursor: context-menu !important;
    }
    .i18n-studio-active [data-i18n-key]:hover {
      outline: 2px solid #3b82f6 !important;
      background: rgba(59, 130, 246, 0.05) !important;
    }
  `;
  document.head.appendChild(style);

  // --- 3. THE EDIT MODAL ---
  function showEditModal(keys: string[], targetElement: HTMLElement) {
    document.getElementById("i18n-studio-modal")?.remove();

    const { locale, getLocaleMessage } = nuxtApp.$i18n;
    const messages = getLocaleMessage(locale.value);

    const modal = document.createElement("div");
    modal.id = "i18n-studio-modal";
    modal.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; padding: 24px; border-radius: 12px; z-index: 2147483648;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); width: 400px;
      border: 1px solid #e5e7eb; font-family: sans-serif; color: #111827;
    `;

    modal.innerHTML = `<h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700;">Edit Translation</h3>`;
    const form = document.createElement("form");

    keys.forEach((key) => {
      const rawEntry = key
        .split(".")
        .reduce((obj: any, i) => obj?.[i], messages);

      // Better raw value resolution
      let displayValue = "";
      if (typeof rawEntry === "string") displayValue = rawEntry;
      else if (rawEntry?.loc?.source) displayValue = rawEntry.loc.source;
      else displayValue = key; // Fallback to key if not found

      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "16px";
      wrapper.innerHTML = `
        <label style="display: block; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">${key}</label>
        <input type="text" value="${displayValue}" data-key="${key}" class="i18n-input"
               style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-family: monospace; font-size: 14px; color: #111827;">
      `;

      const variablesMatch = displayValue.match(/\{([^}]+)\}/g);
      if (variablesMatch) {
        const hints = document.createElement("div");
        hints.style.cssText =
          "margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;";
        hints.innerHTML = variablesMatch
          .map(
            (v) =>
              `<span style="background: #eff6ff; color: #2563eb; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">${v}</span>`,
          )
          .join("");
        wrapper.appendChild(hints);
      }
      form.appendChild(wrapper);
    });

    const btnContainer = document.createElement("div");
    btnContainer.style.cssText =
      "display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;";
    btnContainer.innerHTML = `
      <button type="button" id="i18n-cancel" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 6px; cursor: pointer;">Cancel</button>
      <button type="submit" style="padding: 8px 16px; border: none; background: #2563eb; color: white; border-radius: 6px; cursor: pointer; font-weight: 600;">Apply Preview</button>
    `;
    form.appendChild(btnContainer);

    form.onsubmit = (e) => {
      e.preventDefault();
      const inputs = form.querySelectorAll(
        ".i18n-input",
      ) as NodeListOf<HTMLInputElement>;
      inputs.forEach((input) => {
        const key = input.dataset.key!;
        pendingChanges.value[key] = input.value;
        if (key === keys[0]) {
          targetElement.innerText = input.value;
        }
      });

      targetElement.style.outline = "2px dashed #eab308";
      targetElement.style.backgroundColor = "rgba(234, 179, 8, 0.1)";
      modifiedElements.value.push(targetElement);
      modal.remove();
      renderGlobalSaveButton();
    };

    modal.appendChild(form);
    document.body.appendChild(modal);
    modal
      .querySelector("#i18n-cancel")
      ?.addEventListener("click", () => modal.remove());
  }
  // --- 4. GLOBAL SAVE BUTTON & REFINED MEMORY SYNC ---
  function renderGlobalSaveButton() {
    let bar = document.getElementById("i18n-global-save");
    const count = Object.keys(pendingChanges.value).length;

    if (count === 0) {
      bar?.remove();
      return;
    }

    if (!bar) {
      bar = document.createElement("div");
      bar.id = "i18n-global-save";
      bar.style.cssText = `position: fixed; bottom: 24px; right: 24px; background: #111827; color: white; padding: 12px 20px; border-radius: 10px; z-index: 2147483649; display: flex; align-items: center; gap: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); font-family: sans-serif;`;
      document.body.appendChild(bar);
    }

    bar.innerHTML = `
      <span style="font-size: 14px;">${count} unsaved change${count > 1 ? "s" : ""}</span>
      <button id="i18n-publish-btn" style="background: #10b981; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 600; cursor: pointer;">Publish to JSON</button>
    `;

  document.getElementById("i18n-publish-btn")!.onclick = async () => {
      const btn = document.getElementById("i18n-publish-btn") as HTMLButtonElement;
      btn.innerText = "Saving...";
      btn.disabled = true;

      const changesToApply = { ...pendingChanges.value };
      const nestedUpdates = unflattenObject(changesToApply);
      const i18n = nuxtApp.$i18n;
      const currentLocale = i18n?.locale?.value || "en";

      // 1. THE TRICK: Update memory BEFORE the save.
      // This is what you had before. It prevents the flicker because
      // when Vite re-renders, the memory is ALREADY updated.
      i18n.mergeLocaleMessage(currentLocale, nestedUpdates);

      const applyNativeI18nSync = () => {
        // Clean up the listener so we don't get the "second time bug"
        if (import.meta.hot) {
          import.meta.hot.off('vite:afterUpdate', applyNativeI18nSync);
        }

        // Re-apply once more just to be sure Vite didn't wipe it
        i18n.mergeLocaleMessage(currentLocale, nestedUpdates);

        const temp = i18n.locale.value;
        i18n.locale.value = "";
        nextTick(() => { i18n.locale.value = temp; });
      };

      try {
        // 2. Attach the "cleanup" listener
        if (import.meta.hot) {
          import.meta.hot.on('vite:afterUpdate', applyNativeI18nSync);
        }

        // 3. Save to disk
        await $fetch("/api/__i18n_studio/update", {
          method: "POST",
          body: { updates: changesToApply, locale: currentLocale },
        });

        // 4. Force the UI cleanup
        pendingChanges.value = {};
        modifiedElements.value.forEach((el) => {
          el.style.outline = "";
          el.style.backgroundColor = "";
        });
        modifiedElements.value = [];
        document.getElementById("i18n-global-save")?.remove();

      } catch (err) {
        if (import.meta.hot) {
          import.meta.hot.off('vite:afterUpdate', applyNativeI18nSync);
        }
        btn.innerText = "Error - Try Again";
        btn.disabled = false;
      }
    };
  }

  // --- 5. EVENT LISTENERS ---
  document.addEventListener(
    "click",
    (e) => {
      if (!isStudioMode.value) return;
      const target = (e.target as HTMLElement).closest(
        "[data-i18n-key]",
      ) as HTMLElement;
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        const keys = target
          .getAttribute("data-i18n-key")!
          .split(",")
          .map((k) => k.trim());
        showEditModal(keys, target);
      }
    },
    true,
  );

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
      e.preventDefault();
      isStudioMode.value = !isStudioMode.value;
      document.body.classList.toggle("i18n-studio-active", isStudioMode.value);
    }
  });
});
