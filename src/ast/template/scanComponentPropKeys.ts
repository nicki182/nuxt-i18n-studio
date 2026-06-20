import type { SimpleExpressionNode } from "@vue/compiler-dom";
import type { Node, Program, VariableDeclarator, Identifier } from "estree";

import { NodeTypes, parse } from "@vue/compiler-dom";
import { walk } from "zimmerframe";

import type { ScriptVariableMap, ElementCacheEntry, PropKeyMap, PropCandidate } from "../types";

import { TSParser } from "../parser";
import { extractTemplateTranslations } from "./extractTemplateTranslations";

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Builds the prop key map by walking the component tree from pages/layouts.
 *
 * For each $t() call found in a page/component template:
 *   - If passed as a prop to a component → follow that prop through the tree
 *     until it reaches a native element
 *   - Record componentInitial (first component receiving the prop),
 *     componentEnd (component owning the native element), element, key, path
 */
export function buildPropKeyMap(
  fileCache: ElementCacheEntry[],
  entryFilePaths: string[],
): PropKeyMap {
  const propKeyMap: PropKeyMap = new Map();

  const byFilePath = new Map<string, ElementCacheEntry>();
  const byComponentName = new Map<string, ElementCacheEntry>();

  for (const entry of fileCache) {
    byFilePath.set(entry.filePath, entry);
    if (!byComponentName.has(entry.componentName)) {
      byComponentName.set(entry.componentName, entry);
    }
  }

  // Track visited (componentName, propName, key) to avoid cycles
  const visited = new Set<string>();

  function visitKey(
    key: string,
    sourcePath: string,
    componentInitial: string,
    componentName: string,
    propName: string,
  ): void {
    const visitKey_ = `${componentName}::${propName}::${key}`;
    if (visited.has(visitKey_)) return;
    visited.add(visitKey_);

    const entry = byComponentName.get(componentName);
    if (!entry?.templateContent) return;

    let ast;
    try {
      ast = parse(entry.templateContent);
    } catch {
      return;
    }

    // Find where propName is used inside this component's template
    findPropUsage(
      ast,
      propName,
      key,
      sourcePath,
      componentInitial,
      componentName,
      entry,
      byComponentName,
      propKeyMap,
      visited,
      visitKey,
    );
  }

  // Walk each entry point
  for (const filePath of entryFilePaths) {
    const entry = byFilePath.get(filePath);
    if (!entry?.templateContent) continue;

    let ast;
    try {
      ast = parse(entry.templateContent);
    } catch {
      continue;
    }

    // Find all $t() calls in this page/layout template
    // and trace them through the component tree
    walkPageNode(
      ast,
      entry,
      byComponentName,
      propKeyMap,
      visited,
      visitKey,
    );
  }

  return propKeyMap;
}

// ── Walk page/component template ──────────────────────────────────────────────

/**
 * Walks a template AST node. For each component usage with a $t() prop binding:
 * - Extracts the key from the $t() call
 * - Calls visitKey to follow it through the child component
 *
 * Also recurses into child component templates for their own $t() calls.
 */
function walkPageNode(
  node: unknown,
  fileEntry: ElementCacheEntry,
  byComponentName: Map<string, ElementCacheEntry>,
  propKeyMap: PropKeyMap,
  visited: Set<string>,
  visitKey: (
    key: string,
    sourcePath: string,
    componentInitial: string,
    componentName: string,
    propName: string,
  ) => void,
): void {
  if (!node || typeof node !== "object") return;
  const n = node as {
    type?: number;
    tag?: string;
    tagType?: number;
    props?: unknown[];
    children?: unknown[];
    content?: unknown;
  };

  if (n.type === NodeTypes.ELEMENT) {
    // Component element — check bound props for $t() calls
    if (n.tagType === 1 && n.tag && Array.isArray(n.props)) {
      for (const prop of n.props) {
        const p = prop as {
          type?: number;
          name?: string;
          arg?: unknown;
          exp?: unknown;
        };
        if (p.type !== NodeTypes.DIRECTIVE || p.name !== "bind") continue;

        const arg = p.arg as SimpleExpressionNode | undefined;
        const exp = p.exp as SimpleExpressionNode | undefined;
        if (!arg || !exp) continue;

        const propName = arg.content;
        const expression = exp.loc?.source?.trim();
        if (!propName || !expression) continue;

        // Extract keys from $t() calls in this expression
        const keys = extractKeys(expression, fileEntry.scriptVariableMap);

        for (const key of keys) {
          visitKey(
            key,
            fileEntry.filePath,
            n.tag,    // componentInitial = first component receiving this prop
            n.tag,    // start tracing from this component
            propName,
          );
        }
      }

      // Recurse into this child component's own template
      const childEntry = byComponentName.get(n.tag);
      if (childEntry) {
        const visitedComp = `__comp__${n.tag}`;
        if (!visited.has(visitedComp)) {
          visited.add(visitedComp);
          if (childEntry.templateContent) {
            let ast;
            try {
              ast = parse(childEntry.templateContent);
            } catch {
              ast = null;
            }
            if (ast) {
              walkPageNode(
                ast,
                childEntry,
                byComponentName,
                propKeyMap,
                visited,
                visitKey,
              );
            }
          }
        }
      }
    }
  }

  // Recurse into children
  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      walkPageNode(child, fileEntry, byComponentName, propKeyMap, visited, visitKey);
    }
  }
}

// ── Find prop usage inside a component ───────────────────────────────────────

/**
 * Given a component template and a prop name, finds where that prop is used:
 * - If in a native element interpolation → record the result in propKeyMap
 * - If passed to another component → recurse with visitKey
 */
function findPropUsage(
  node: unknown,
  propName: string,
  key: string,
  sourcePath: string,
  componentInitial: string,
  currentComponentName: string,
  fileEntry: ElementCacheEntry,
  byComponentName: Map<string, ElementCacheEntry>,
  propKeyMap: PropKeyMap,
  visited: Set<string>,
  visitKey: (
    key: string,
    sourcePath: string,
    componentInitial: string,
    componentName: string,
    propName: string,
  ) => void,
): void {
  if (!node || typeof node !== "object") return;
  const n = node as {
    type?: number;
    tag?: string;
    tagType?: number;
    props?: unknown[];
    children?: unknown[];
    content?: unknown;
  };

  // Build the set of expressions that could carry this prop
  // e.g. propName="header" → refs = { "header", "headerName" }
  const propRefs = fileEntry.scriptContent
    ? buildPropRefs(propName, fileEntry.scriptVariableMap, fileEntry.scriptContent)
    : new Set<string>([propName]);

  if (n.type === NodeTypes.ELEMENT) {
    // Native element — check if any child interpolation uses a prop ref
    if (n.tagType === 0 && n.tag) {
      if (Array.isArray(n.children)) {
        for (const child of n.children) {
          const c = child as {
            type?: number;
            content?: { loc?: { source?: string } };
          };
          if (c.type === NodeTypes.INTERPOLATION) {
            const expr = c.content?.loc?.source?.trim();
            if (expr && propRefs.has(expr)) {
              // Found the leaf — record in propKeyMap
              recordCandidate(propKeyMap, currentComponentName, propName, {
                key,
                path: sourcePath,
                componentInitial,
                componentEnd: currentComponentName,
                propName,
                element: n.tag,
              });
              return;
            }
          }
        }
      }

      // Also check bound attributes on native elements
      if (Array.isArray(n.props)) {
        for (const prop of n.props) {
          const p = prop as {
            type?: number;
            name?: string;
            arg?: unknown;
            exp?: unknown;
          };
          if (p.type !== NodeTypes.DIRECTIVE || p.name !== "bind") continue;
          const exp = p.exp as SimpleExpressionNode | undefined;
          const expression = exp?.loc?.source?.trim();
          if (expression && propRefs.has(expression)) {
            const attrName =
              (p.arg as SimpleExpressionNode | undefined)?.content ?? "unknown";
            recordCandidate(propKeyMap, currentComponentName, propName, {
              key,
              path: sourcePath,
              componentInitial,
              componentEnd: currentComponentName,
              propName,
              element: `${n.tag}[${attrName}]`,
            });
            return;
          }
        }
      }
    }

    // Component element — check if prop is being forwarded via a bound prop
    if (n.tagType === 1 && n.tag && Array.isArray(n.props)) {
      for (const prop of n.props) {
        const p = prop as {
          type?: number;
          name?: string;
          arg?: unknown;
          exp?: unknown;
        };
        if (p.type !== NodeTypes.DIRECTIVE || p.name !== "bind") continue;

        const arg = p.arg as SimpleExpressionNode | undefined;
        const exp = p.exp as SimpleExpressionNode | undefined;
        if (!arg || !exp) continue;

        const childPropName = arg.content;
        const expression = exp.loc?.source?.trim();
        if (!childPropName || !expression) continue;

        // Check if this binding forwards our prop ref
        if (propRefs.has(expression)) {
          // Prop is being forwarded to child component — recurse
          visitKey(key, sourcePath, componentInitial, n.tag, childPropName);
          return;
        }
      }
    }
  }

  // Recurse into children
  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      findPropUsage(
        child,
        propName,
        key,
        sourcePath,
        componentInitial,
        currentComponentName,
        fileEntry,
        byComponentName,
        propKeyMap,
        visited,
        visitKey,
      );
    }
  }
}

// ── Record candidate ──────────────────────────────────────────────────────────

function recordCandidate(
  propKeyMap: PropKeyMap,
  componentName: string,
  propName: string,
  candidate: PropCandidate,
): void {
  if (!propKeyMap.has(componentName)) {
    propKeyMap.set(componentName, new Map());
  }

  const propMap = propKeyMap.get(componentName)!;

  if (!propMap.has(propName)) {
    propMap.set(propName, {
      element: candidate.element,
      candidates: [],
    });
  }

  const entry = propMap.get(propName)!;

  // Deduplicate by key + path
  const alreadyExists = entry.candidates.some(
    (c) => c.key === candidate.key && c.path === candidate.path,
  );
  if (!alreadyExists) {
    entry.candidates.push(candidate);
  }
}

// ── Key extraction ────────────────────────────────────────────────────────────

function extractKeys(
  expression: string,
  scriptVariableMap: ScriptVariableMap,
): string[] {
  const keys: string[] = [];

  for (const entry of extractTemplateTranslations(expression, scriptVariableMap)) {
    if ("key" in entry && entry.key) {
      keys.push(entry.key);
    }
    if ("allCandidates" in entry) {
      (entry.allCandidates as { key: string }[]).forEach((c) => {
        if (c.key) keys.push(c.key);
      });
    }
  }

  return [...new Set(keys)];
}

// ── Prop ref tracing ──────────────────────────────────────────────────────────

function buildPropRefs(
  propName: string,
  scriptVariableMap: ScriptVariableMap,
  scriptCode: string,
): Set<string> {
  const refs = new Set<string>([propName]);

  if (scriptVariableMap.get(propName)?.includes("__PROP__")) {
    refs.add(propName);
  }

  try {
    const ast = TSParser.parse(scriptCode, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    }) as unknown as Program;

    walk(ast as Program, refs as Set<string>, {
      _(
        node: Node,
        { state: refs, next }: { state: Set<string>; next: () => void },
      ) {
        next();
        if (node.type !== "VariableDeclarator") return;
        const decl = node as VariableDeclarator;
        if (decl.id.type !== "Identifier") return;
        const varName = (decl.id as Identifier).name;
        if (decl.init && referencesPropsAccess(decl.init, propName)) {
          refs.add(varName);
        }
      },
    });
  } catch {
    // parse failure — use what we have
  }

  return refs;
}

function referencesPropsAccess(node: unknown, propName: string): boolean {
  if (!node || typeof node !== "object") return false;
  const n = node as Record<string, unknown>;

  if (
    n["type"] === "MemberExpression" &&
    (n["object"] as Record<string, unknown>)?.["type"] === "Identifier" &&
    (n["object"] as Record<string, unknown>)?.["name"] === "props" &&
    (n["property"] as Record<string, unknown>)?.["type"] === "Identifier" &&
    (n["property"] as Record<string, unknown>)?.["name"] === propName
  ) {
    return true;
  }

  for (const key of Object.keys(n)) {
    if (key === "type") continue;
    const child = n[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (referencesPropsAccess(item, propName)) return true;
      }
    } else if (referencesPropsAccess(child, propName)) {
      return true;
    }
  }

  return false;
}
