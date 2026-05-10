// 1. Define an interface extending HTMLElement for our custom property
interface I18nHTMLElement extends HTMLElement {
  __i18nHandler?: (e: Event) => void;
}
