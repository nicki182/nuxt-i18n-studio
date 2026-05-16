import type { Literal } from "estree";

import { KeyExtractionType, type ExtractedKey } from "../../types";

/**
 *
 * @param args
 * @param args.node
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
