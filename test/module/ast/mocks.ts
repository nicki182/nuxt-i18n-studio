// ── Helpers ───────────────────────────────────────────────────────────────────

import type {
  Literal,
  Identifier,
  ReturnStatement,
  BlockStatement,
  ArrowFunctionExpression,
  Expression,
  FunctionExpression,
  FunctionDeclaration,
  ObjectExpression,
  Property,
  ArrayExpression,
  CallExpression,
  MemberExpression,
  AssignmentExpression,
} from "estree";

/**
 *
 * @param name
 */
export function mockIdentifier(name: string): Identifier {
  return { type: "Identifier", name };
}

/**
 *
 * @param value
 */
export function mockLiteral(value: string): Literal {
  return { type: "Literal", value, raw: `'${value}'` };
}

/**
 *
 * @param value
 */
export function mockReturnStatement(value: string): ReturnStatement {
  return { type: "ReturnStatement", argument: mockLiteral(value) };
}

/**
 *
 * @param statements
 */
export function mockBlockStatement(
  statements: ReturnStatement[],
): BlockStatement {
  return { type: "BlockStatement", body: statements };
}

/**
 *
 * @param body
 */
export function mockArrowImplicit(body: Expression): ArrowFunctionExpression {
  return {
    type: "ArrowFunctionExpression",
    params: [],
    body,
    expression: true,
    async: false,
    generator: false,
  };
}

/**
 *
 * @param statements
 */
export function mockArrowBlock(
  statements: ReturnStatement[],
): ArrowFunctionExpression {
  return {
    type: "ArrowFunctionExpression",
    params: [],
    body: mockBlockStatement(statements),
    expression: false,
    async: false,
    generator: false,
  };
}

/**
 *
 * @param statements
 */
export function mockFunctionExpression(
  statements: ReturnStatement[],
): FunctionExpression {
  return {
    type: "FunctionExpression",
    params: [],
    body: mockBlockStatement(statements),
    async: false,
    generator: false,
  };
}

/**
 *
 * @param name
 * @param statements
 */
export function mockFunctionDeclaration(
  name: string,
  statements: ReturnStatement[],
): FunctionDeclaration {
  return {
    type: "FunctionDeclaration",
    id: mockIdentifier(name),
    params: [],
    body: mockBlockStatement(statements),
    async: false,
    generator: false,
  };
}

/**
 *
 * @param keyName
 */
export function mockProperty(keyName: string): Property {
  return {
    type: "Property",
    key: mockIdentifier(keyName),
    value: mockIdentifier("String"),
    kind: "init",
    method: false,
    shorthand: false,
    computed: false,
  };
}

/**
 *
 * @param propNames
 */
export function mockObjectExpression(propNames: string[]): ObjectExpression {
  return {
    type: "ObjectExpression",
    properties: propNames.map(mockProperty),
  };
}

/**
 *
 * @param values
 */
export function mockArrayExpression(values: string[]): ArrayExpression {
  return {
    type: "ArrayExpression",
    elements: values.map(mockLiteral),
  };
}

/**
 *
 * @param arg
 */
export function mockDefinePropsCall(
  arg?: CallExpression["arguments"][number],
): CallExpression {
  return {
    type: "CallExpression",
    callee: mockIdentifier("defineProps"),
    arguments: arg ? [arg] : [],
    optional: false,
  };
}

/**
 *
 * @param name
 */
export function mockOtherCall(name: string): CallExpression {
  return {
    type: "CallExpression",
    callee: mockIdentifier(name),
    arguments: [],
    optional: false,
  };
}
/**
 *
 * @param objectName
 * @param propertyName
 * @param computed
 */
export function mockMemberExpression(
  objectName: string,
  propertyName: string,
  computed = false,
): MemberExpression {
  return {
    type: "MemberExpression",
    object: mockIdentifier(objectName),
    property: mockIdentifier(propertyName),
    computed,
    optional: false,
  };
}

/**
 *
 * @param left
 * @param right
 */
export function mockAssignment(
  left: AssignmentExpression["left"],
  right: AssignmentExpression["right"],
): AssignmentExpression {
  return {
    type: "AssignmentExpression",
    operator: "=",
    left,
    right,
  };
}
