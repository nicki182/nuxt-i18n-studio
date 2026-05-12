import * as acorn from "acorn";

export function extractI18nArguments(code: string): string[] {
  const extractedKeys = new Set<string>();

  try {
    const prefix = `(function(){return `;
    const wrappedCode = `${prefix}${code}})()`;
    const ast = acorn.parse(wrappedCode, { ecmaVersion: "latest" });

    function walk(node: any) {
      if (!node) return;

      if (node.type === "CallExpression") {
        const isT = node.callee?.name === "$t" || node.callee?.name === "t";
        const isMemberT =
          node.callee?.type === "MemberExpression" &&
          (node.callee.property?.name === "t" || node.callee.property?.name === "$t");

        if ((isT || isMemberT) && node.arguments?.length > 0) {
          const firstArg = node.arguments[0];

          // 1. EXTRACT FULL EXPRESSION: Grab the exact string (e.g. "getKey()" or "dynamicKey")
          const argString = wrappedCode.slice(firstArg.start, firstArg.end);
          if (argString) {
            extractedKeys.add(`__EXPR__${argString}`);
          }

          // 2. EXTRACT LITERALS: Find all static strings (for ternaries like isAdmin ? 'a' : 'b')
          function extractLiterals(innerNode: any) {
            if (!innerNode) return;

            if (innerNode.type === "Literal" && typeof innerNode.value === "string") {
              extractedKeys.add(innerNode.value);
            }

            for (const key in innerNode) {
              if (innerNode[key] && typeof innerNode[key] === "object") {
                extractLiterals(innerNode[key]);
              }
            }
          }

          extractLiterals(firstArg);
        }
      }

      for (const key in node) {
        if (node[key] && typeof node[key] === "object") {
          walk(node[key]);
        }
      }
    }

    walk(ast);
  } catch (e) {
    // Fail silently on malformed JS to prevent build crashes
  }
  console.log("Extracted i18n keys/expressions:", Array.from(extractedKeys));
  return Array.from(extractedKeys);
}
