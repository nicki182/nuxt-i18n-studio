// runtime/plugins/00.timer-freeze.ts
export default defineNuxtPlugin(() => {
  if (window.__i18nTimerPatchDone) return;
  window.__i18nTimerPatchDone = true;

  window.__i18nStudioMode = false;
  const pending = new Map();
  const realTimeoutIds: number[] = [];
  let counter = 0;

  const origSetTimeout = window.setTimeout;
  const origSetInterval = window.setInterval;
  const origClearTimeout = window.clearTimeout;

  window.setTimeout = function (cb: Function, delay?: number, ...args: any[]) {
    if (window.__i18nStudioMode) {
      const id = ++counter;
      pending.set(id, { cb, args });
      return id;
    }
    const id = origSetTimeout(cb, delay, ...args) as unknown as number;
    realTimeoutIds.push(id);
    return id;
  } as any;

  window.setInterval = function (cb: Function, delay?: number, ...args: any[]) {
    if (window.__i18nStudioMode) {
      ++counter;
      return counter;
    }
    const id = origSetInterval(cb, delay, ...args) as unknown as number;
    // we track it too, just in case
    realTimeoutIds.push(id);
    return id;
  } as any;

  window.clearTimeout = function (id?: number) {
    pending.delete(id!);
    const idx = realTimeoutIds.indexOf(id!);
    if (idx > -1) realTimeoutIds.splice(idx, 1);
    origClearTimeout(id);
  } as any;

  // Cancel all real timeouts that are still pending
  window.__i18nCancelAllTimers = function () {
    realTimeoutIds.forEach((id) => origClearTimeout(id));
    realTimeoutIds.length = 0;
  };

  // Flush (and discard) queued timeouts when unfreezing
  window.__i18nFlushTimers = function () {
    pending.forEach(({ cb, args }) => {
      try {
        cb(...args);
      } catch (e) {}
    });
    pending.clear();
  };
});
