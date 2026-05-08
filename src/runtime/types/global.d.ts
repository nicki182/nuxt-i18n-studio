export declare global {
  interface Window {
    __i18nTimerPatchDone?: boolean;
    __i18nStudioMode?: boolean;
    __i18nCancelAllTimers?: () => void;
    __i18nFlushTimers?: () => void;
  }
}
