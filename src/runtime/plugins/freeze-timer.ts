export default defineNuxtPlugin(() => {
  // Ensure we are in the browser
  if (!window || window.__i18nTimerPatchDone) return;
  window.__i18nTimerPatchDone = true;

  window.__i18nStudioMode = false;

  const pending = new Map<number, { cb: TimerHandler; args: unknown[] }>();
  const realTimeoutIds: number[] = [];
  let counter = 0;

  const origSetTimeout = window.setTimeout;
  const origSetInterval = window.setInterval;
  const origClearTimeout = window.clearTimeout;

  // 1. Wrap the function and cast "as unknown as typeof window.setTimeout"
  window.setTimeout = function (
    cb: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ) {
    if (window.__i18nStudioMode) {
      const id = ++counter;
      pending.set(id, { cb, args });
      return id;
    }
    const id = origSetTimeout(cb, delay, ...args) as unknown as number;
    realTimeoutIds.push(id);
    return id;
  } as unknown as typeof window.setTimeout;

  // 2. Same here for setInterval
  window.setInterval = function (
    cb: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ) {
    if (window.__i18nStudioMode) {
      ++counter;
      return counter;
    }
    const id = origSetInterval(cb, delay, ...args) as unknown as number;
    realTimeoutIds.push(id);
    return id;
  } as unknown as typeof window.setInterval;

  // 3. Same here for clearTimeout
  window.clearTimeout = function (id?: number) {
    if (id !== undefined) {
      pending.delete(id);
      const idx = realTimeoutIds.indexOf(id);
      if (idx > -1) realTimeoutIds.splice(idx, 1);
    }
    origClearTimeout(id);
  } as unknown as typeof window.clearTimeout;

  window.__i18nCancelAllTimers = function () {
    realTimeoutIds.forEach((id) => origClearTimeout(id));
    realTimeoutIds.length = 0;
  };

  window.__i18nFlushTimers = function () {
    pending.forEach(({ cb, args }) => {
      // Execute only if it's actually a function
      if (typeof cb === "function") {
        cb(...args);
      }
    });
    pending.clear();
  };
});
