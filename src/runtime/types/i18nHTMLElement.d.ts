interface I18nHTMLElement extends HTMLElement {
  __i18nHandler?: (e: Event) => void;
  __i18nEvaluatedUsages?: { key: string; type: string }[];
}
