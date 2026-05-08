export interface I18nInstance {
  t: (this: I18nInstance, ...args: unknown[]) => unknown;
  locale: { value: string };
  getLocaleMessage: (locale: string) => Record<string, unknown>;
  mergeLocaleMessage: (
    locale: string,
    message: Record<string, unknown>,
  ) => void;
}
