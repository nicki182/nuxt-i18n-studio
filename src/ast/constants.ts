// Zero runtime cost, same usage as enum
export const KeyExtractionType = {
  Static: "static",
  Traced: "traced",
  Prop: "prop",
  Dynamic: "dynamic",
  Prefix: "prefix",
  Direct: "direct",
} as const;

export type KeyExtractionType =
  (typeof KeyExtractionType)[keyof typeof KeyExtractionType];

// The HTML attribute developers use to declare possible translation keys
// for dynamic expressions that can't be statically resolved.
// Usage: <p data-i18n-keys="home.key.one,home.key.two">{{ $t(dynamicKey) }}</p>
export const DECLARED_KEYS_ATTR = "data-i18n-keys";

export const BARE_IDENTIFIER_RE = /^\s*([a-z_$][\w$]*)\s*$/i;

// Native HTML element attributes that can contain translatable text.
// Used in transformTemplateElement to decide which :attr="$t(...)" bindings
// are worth injecting keys for. Component props are handled separately
// via scanComponentPropKeys and have no name restriction.
export const TRANSLATABLE_ATTRS = [
  "label",
  "placeholder",
  "title",
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "alt",
  "content",
  "tooltip",
  "helper-text",
] as const;

export type TranslatableAttr = (typeof TRANSLATABLE_ATTRS)[number];

export const PROP_MAP_ROUTE = "/__i18n_studio/prop-map.json";
export const PROP_MAP_FILE = ".i18n-studio/prop-map.json";
