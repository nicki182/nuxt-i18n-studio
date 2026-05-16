export interface ResolvedUsage {
  key: string;
  type: string; // "text:dynamic" | "attr:placeholder" | etc.
  source: "static" | "traced" | "runtime" | "prop";
}

interface I18nHTMLElement extends HTMLElement {
  __i18nUsages?: ResolvedUsage[];
  __i18nHandler?: (e: Event) => void;
}
