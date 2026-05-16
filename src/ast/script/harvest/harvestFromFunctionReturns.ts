import type {
  ArrowFunctionExpression,
  BlockStatement,
  Expression,
  FunctionExpression,
  FunctionDeclaration,
  ReturnStatement,
} from "estree";

import { walk } from "zimmerframe";

import type { ReturnHarvestedValue } from "../../types";

import { harvestLiterals } from "./harvestFromLiterals";

/**
 *
 * @param fnNode
 * @param name
 */
export function harvestFunctionReturns(
  fnNode: FunctionExpression | ArrowFunctionExpression | FunctionDeclaration,
  name: string,
): ReturnHarvestedValue {
  const body = fnNode.body;
  const literals: ReturnHarvestedValue = [];

  // Implicit return: () => 'home.foo' | () => cond ? 'a' : 'b'
  // ArrowFunctionExpression.body is BlockStatement | Expression
  if (body.type !== "BlockStatement") {
    literals.push(...harvestLiterals(body as Expression, name));
    return literals;
  }

  // Explicit return statements inside block body
  walk(
    body as BlockStatement,
    {},
    {
      _(node: BlockStatement | ReturnStatement | Expression, { next }) {
        next();
        if (node.type !== "ReturnStatement") return;
        const returnNode = node as ReturnStatement;
        if (!returnNode.argument) return;
        literals.push(...harvestLiterals(returnNode.argument, name));
      },
    },
  );

  return literals;
}
