// ── MINIMAL VUE AST TYPES ──────────────────────────────────
interface ASTNode {
  type: number;
  loc: { source: string; [key: string]: unknown };
  __i18nWrapped?: boolean;
}

interface ASTElement extends ASTNode {
  type: 1;
  tag: string;
  tagType: number;
  props: (ASTAttribute | ASTDirective)[];
  children: (ASTNode | ASTInterpolation)[];
}

interface ASTInterpolation extends ASTNode {
  type: 5;
  content?: {
    content?: string;
    loc?: { source: string };
  };
}

interface ASTAttribute {
  type: 6;
  name: string;
  value?: {
    type: number;
    content: string;
    loc: unknown;
  };
  loc: unknown;
}

interface ASTDirective {
  type: 7;
  name: string;
  arg?: { content?: string };
  exp?: { content?: string; loc?: { source: string } };
  loc: unknown;
}
