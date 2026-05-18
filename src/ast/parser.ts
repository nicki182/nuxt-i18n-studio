// src/ast/parser.ts
import { tsPlugin } from "@sveltejs/acorn-typescript";
import * as acorn from "acorn";

// We use a custom parser that extends acorn with TypeScript support to parse both <script setup> blocks and
// template expressions, allowing us to build the ScriptVariableMap and resolve keys from complex expressions in the template.
export const TSParser = acorn.Parser.extend(tsPlugin());
