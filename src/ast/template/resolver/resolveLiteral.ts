import type { Literal } from "estree";

import type { ExtractedKey } from "../../types";

import { KeyExtractionType } from "../../constants";

/**
 * Resolves a Literal node to extract potential i18n keys. If the literal value is a non-empty string,
 * it returns an ExtractedKey with type Static. Otherwise, it returns an empty array.
 * @param args An object containing the Literal node to resolve.
 * @param args.node The Literal node to resolve.
 * @returns An array of extracted keys, where each key is an object containing the resolved value and associated metadata.
 */
export function resolveLiteral(args: { node: Literal }): ExtractedKey[] {
  const { node } = args;
  if (typeof node.value === "string" && node.value) {
    return [
      {
        type: KeyExtractionType.Static,
        key: node.value,
        id: `__STATIC__${node.value}`,
      },
    ];
  }
  return [];
}
