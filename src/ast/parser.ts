// src/ast/parser.ts
import { tsPlugin } from "@sveltejs/acorn-typescript";
import * as acorn from "acorn";

export const TSParser = acorn.Parser.extend(tsPlugin());
