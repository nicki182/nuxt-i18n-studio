import { useStudioState } from "../composables/useStudioState";

// Keep these local to the file so they don't pollute the app
let hasPatchedTimers = false;
const pending = new Map<number, { cb: TimerHandler; args: unknown[] }>();
const realTimeoutIds: number[] = [];
let counter = 0;

export default defineNuxtPlugin(() => {
  if (!window || hasPatchedTimers) return;
  hasPatchedTimers = true;

  const { isStudioMode, freezeControls } = useStudioState();

  // Wire up the control functions so toggleMode() can call them
  freezeControls.flush = () => {
    pending.forEach(({ cb, args }) => {
      if (typeof cb === "function") cb(...args);
    });
    pending.clear();
  };

  freezeControls.cancelAll = () => {
    realTimeoutIds.forEach((id) => window.clearTimeout(id));
    realTimeoutIds.length = 0;
  };

  // --- Patching Logic ---
  const origSetTimeout = window.setTimeout;
  const origSetInterval = window.setInterval;
  const origClearTimeout = window.clearTimeout;

  window.setTimeout = function (
    cb: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ) {
    if (isStudioMode.value) {
      const id = ++counter;
      pending.set(id, { cb, args });
      return id;
    }
    const id = origSetTimeout(cb, delay, ...args) as unknown as number;
    realTimeoutIds.push(id);
    return id;
  } as unknown as typeof window.setTimeout;

  window.setInterval = function (
    cb: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ) {
    if (isStudioMode.value) {
      ++counter;
      return counter;
    }
    const id = origSetInterval(cb, delay, ...args) as unknown as number;
    realTimeoutIds.push(id);
    return id;
  } as unknown as typeof window.setInterval;

  window.clearTimeout = function (id?: number) {
    if (id !== undefined) {
      pending.delete(id);
      const idx = realTimeoutIds.indexOf(id);
      if (idx > -1) realTimeoutIds.splice(idx, 1);
    }
    origClearTimeout(id);
  } as unknown as typeof window.clearTimeout;
});
