import type {
  ArrowFunctionExpression,
  CallExpression,
  ConditionalExpression,
  Expression,
  FunctionExpression,
  Identifier,
  Literal,
  LogicalExpression,
  TemplateLiteral,
  VariableDeclarator,
} from "estree";

import type { ReturnHarvestedValue } from "../../types";

import { harvestFunctionReturns } from "./harvestFromFunctionReturns";
import { harvestLiterals } from "./harvestFromLiterals";

/**
 *
 * @param node
 */
export function harvestFromVariableDeclarator(
  node: VariableDeclarator,
): ReturnHarvestedValue | undefined {
  const init = node.init;
  if (!init) return;

  // node.id can be Identifier | ObjectPattern | ArrayPattern
  // we only care about simple const name = ... declarations
  if (node.id.type !== "Identifier") return;
  const name = (node.id as Identifier).name;

  // ref('value') or reactive('value')
  if (isRefOrReactive(init)) {
    const firstArg = (init as CallExpression).arguments[0];
    if (
      firstArg?.type === "Literal" &&
      typeof (firstArg as Literal).value === "string"
    ) {
      return [{ value: (firstArg as Literal).value as string, name }];
    }
  }

  // const key = 'home.foo'
  if (init.type === "Literal" && typeof (init as Literal).value === "string") {
    return [{ value: (init as Literal).value as string, name }];
  }

  // Arrow or function expression — trace all return values
  if (
    init.type === "ArrowFunctionExpression" ||
    init.type === "FunctionExpression"
  ) {
    const returns = harvestFunctionReturns(
      init as FunctionExpression | ArrowFunctionExpression,
      name,
    );
    if (returns.length) return returns;
  }

  // const key = cond ? 'a' : 'b'
  return harvestLiterals(
    init as
      | ConditionalExpression
      | LogicalExpression
      | TemplateLiteral
      | Literal,
    name,
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isRefOrReactive(node: Expression): node is CallExpression {
  if (node.type !== "CallExpression") return false;
  const callee = node.callee;
  // callee is Expression | Super — narrow to Identifier for name check
  return (
    callee.type === "Identifier" &&
    (callee.name === "ref" || callee.name === "reactive")
  );
}
