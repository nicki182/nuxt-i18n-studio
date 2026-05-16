import { walk } from "zimmerframe";

import type { ReturnHarvestedValue } from "../types";

import { harvestLiterals } from "./harvestFromLiterals";

export function harvestFunctionReturns(fnNode: any, name: string): ReturnHarvestedValue {
  const body = fnNode.body;
  if (!body) return [] as ReturnHarvestedValue;

  const literals: ReturnHarvestedValue = [];

  if (body.type !== "BlockStatement") {
    // Implicit return
    literals.push(...harvestLiterals(body, name));
  } else {
    walk(
      body,
      {},
      {
        _(node: any, { next }) {
          next();
          if (node.type !== "ReturnStatement" || !node.argument) return;
          literals.push(...harvestLiterals(node.argument, name));
        },
      },
    );
  }

  return literals;
}
