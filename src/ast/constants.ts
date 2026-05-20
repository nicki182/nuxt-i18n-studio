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

export const BARE_IDENTIFIER_RE = /^\s*([i_$][\w$]*)\s*$/;
