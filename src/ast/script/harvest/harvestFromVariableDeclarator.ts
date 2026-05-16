import type { ReturnHarvestedValue } from "../../types";

import { harvestFunctionReturns } from "./harvestFromFunctionReturns";
import { harvestLiterals } from "./harvestFromLiterals";

export function harvestFromVariableDeclarator(
  node: any,
): ReturnHarvestedValue | undefined {
  const init = node.init;
  if (!init) return;
  const name = node.id?.name;
  if (!name) return;

  // ref('value') or reactive('value')
  if (
    init.type === "CallExpression" &&
    (init.callee?.name === "ref" || init.callee?.name === "reactive") &&
    init.arguments[0]?.type === "Literal" &&
    typeof init.arguments[0].value === "string"
  ) {
    return [{ value: init.arguments[0].value, name }];
  }

  // const key = 'home.foo'
  if (init.type === "Literal" && typeof init.value === "string") {
    return [{ value: init.value, name }];
  }

  // Arrow or function expression — trace all return values
  if (
    init.type === "ArrowFunctionExpression" ||
    init.type === "FunctionExpression"
  ) {
    const returns = harvestFunctionReturns(init, name);
    if (returns.length) {
      return returns;
    }
  }
  // const key = cond ? 'a' : 'b'
  return harvestLiterals(init, name);
}
