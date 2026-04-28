export type TokenType =
  | "text"
  | "punct"
  | "key"
  | "string"
  | "number"
  | "boolean"
  | "keyword"
  | "comment"
  | "type"
  | "tag"
  | "attr"
  | "regex";

export interface Token {
  type: TokenType;
  value: string;
}

const KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "import",
  "from",
  "export",
  "default",
  "async",
  "await",
  "yield",
  "type",
  "interface",
  "enum",
  "new",
  "class",
  "this",
  "super",
  "extends",
  "implements",
  "as",
  "in",
  "of",
  "typeof",
  "instanceof",
  "throw",
  "try",
  "catch",
  "finally",
  "delete",
  "void",
  "readonly",
  "public",
  "private",
  "protected",
  "static",
  "abstract"
]);

const ATOMS = new Set(["true", "false", "null", "undefined"]);

const PRIMITIVE_TYPES = new Set([
  "string",
  "number",
  "boolean",
  "object",
  "any",
  "unknown",
  "never",
  "bigint",
  "symbol"
]);

export function tokenize(language: string, code: string): Token[] {
  const lang = language.toLowerCase();
  if (lang === "json") return tokenizeJson(code);
  if (lang === "ts" || lang === "tsx" || lang === "js" || lang === "jsx") return tokenizeTs(code);
  if (lang === "css") return tokenizeCss(code);
  return [{ type: "text", value: code }];
}

function tokenizeJson(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < code.length) {
    const ch = code[i]!;

    if (/\s/.test(ch)) {
      let j = i;
      while (j < code.length && /\s/.test(code[j]!)) j++;
      tokens.push({ type: "text", value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < code.length && code[j] !== '"') {
        if (code[j] === "\\") j++;
        j++;
      }
      const str = code.slice(i, j + 1);
      let k = j + 1;
      while (k < code.length && /\s/.test(code[k]!)) k++;
      const isKey = code[k] === ":";
      tokens.push({ type: isKey ? "key" : "string", value: str });
      i = j + 1;
      continue;
    }

    if (ch === "-" || /[0-9]/.test(ch)) {
      let j = i;
      if (code[j] === "-") j++;
      while (j < code.length && /[0-9.eE+-]/.test(code[j]!)) j++;
      tokens.push({ type: "number", value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (/[a-z]/i.test(ch)) {
      let j = i;
      while (j < code.length && /[a-z]/i.test(code[j]!)) j++;
      const word = code.slice(i, j);
      tokens.push({
        type: ATOMS.has(word) ? "boolean" : "text",
        value: word
      });
      i = j;
      continue;
    }

    tokens.push({ type: "punct", value: ch });
    i++;
  }
  return tokens;
}

function tokenizeTs(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    const ch = code[i]!;
    const next = code[i + 1];

    // Line comment
    if (ch === "/" && next === "/") {
      let j = i;
      while (j < code.length && code[j] !== "\n") j++;
      tokens.push({ type: "comment", value: code.slice(i, j) });
      i = j;
      continue;
    }

    // Block comment
    if (ch === "/" && next === "*") {
      let j = i + 2;
      while (j < code.length && !(code[j] === "*" && code[j + 1] === "/")) j++;
      tokens.push({ type: "comment", value: code.slice(i, Math.min(j + 2, code.length)) });
      i = j + 2;
      continue;
    }

    // Whitespace
    if (/\s/.test(ch)) {
      let j = i;
      while (j < code.length && /\s/.test(code[j]!)) j++;
      tokens.push({ type: "text", value: code.slice(i, j) });
      i = j;
      continue;
    }

    // String literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === "\\") j++;
        j++;
      }
      tokens.push({ type: "string", value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Template literal — naive (no ${} interpolation handling)
    if (ch === "`") {
      let j = i + 1;
      while (j < code.length && code[j] !== "`") {
        if (code[j] === "\\") j++;
        j++;
      }
      tokens.push({ type: "string", value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < code.length && /[0-9._]/.test(code[j]!)) j++;
      tokens.push({ type: "number", value: code.slice(i, j) });
      i = j;
      continue;
    }

    // JSX tag start: < followed by letter or /
    if (ch === "<") {
      const after = code[i + 1];
      if (after && (/[a-zA-Z/]/.test(after))) {
        // emit `<` then the tag name
        tokens.push({ type: "punct", value: "<" });
        i += 1;
        if (code[i] === "/") {
          tokens.push({ type: "punct", value: "/" });
          i += 1;
        }
        let j = i;
        while (j < code.length && /[a-zA-Z0-9.]/.test(code[j]!)) j++;
        if (j > i) {
          tokens.push({ type: "tag", value: code.slice(i, j) });
          i = j;
        }
        continue;
      }
      tokens.push({ type: "punct", value: "<" });
      i += 1;
      continue;
    }

    // Identifiers / keywords
    if (/[a-zA-Z_$]/.test(ch)) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j]!)) j++;
      const word = code.slice(i, j);

      let type: TokenType;
      if (KEYWORDS.has(word)) type = "keyword";
      else if (ATOMS.has(word)) type = "boolean";
      else if (PRIMITIVE_TYPES.has(word)) type = "type";
      else if (/^[A-Z]/.test(word)) type = "type";
      else type = "text";

      tokens.push({ type, value: word });
      i = j;
      continue;
    }

    // Punctuation / operators
    tokens.push({ type: "punct", value: ch });
    i += 1;
  }

  return tokens;
}

function tokenizeCss(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < code.length) {
    const ch = code[i]!;

    if (ch === "/" && code[i + 1] === "*") {
      let j = i + 2;
      while (j < code.length && !(code[j] === "*" && code[j + 1] === "/")) j++;
      tokens.push({ type: "comment", value: code.slice(i, Math.min(j + 2, code.length)) });
      i = j + 2;
      continue;
    }

    if (/\s/.test(ch)) {
      let j = i;
      while (j < code.length && /\s/.test(code[j]!)) j++;
      tokens.push({ type: "text", value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < code.length && code[j] !== quote) j++;
      tokens.push({ type: "string", value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    if (ch === "@") {
      let j = i + 1;
      while (j < code.length && /[a-z-]/i.test(code[j]!)) j++;
      tokens.push({ type: "keyword", value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (/[a-z-]/i.test(ch)) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_-]/.test(code[j]!)) j++;
      const word = code.slice(i, j);
      let k = j;
      while (k < code.length && /\s/.test(code[k]!)) k++;
      tokens.push({ type: code[k] === ":" ? "attr" : "text", value: word });
      i = j;
      continue;
    }

    tokens.push({ type: "punct", value: ch });
    i++;
  }
  return tokens;
}

export function tokenClass(type: TokenType): string {
  switch (type) {
    case "text":
      return "text-slate-800 dark:text-slate-200";
    case "punct":
      return "text-slate-500 dark:text-slate-400";
    case "key":
      return "text-rose-700 dark:text-rose-300";
    case "string":
      return "text-emerald-700 dark:text-emerald-300";
    case "number":
      return "text-blue-700 dark:text-blue-300";
    case "boolean":
      return "text-amber-700 dark:text-amber-300";
    case "keyword":
      return "text-violet-700 dark:text-violet-300";
    case "comment":
      return "italic text-slate-500 dark:text-slate-500";
    case "type":
      return "text-cyan-700 dark:text-cyan-300";
    case "tag":
      return "text-rose-700 dark:text-rose-300";
    case "attr":
      return "text-amber-700 dark:text-amber-300";
    case "regex":
      return "text-emerald-700 dark:text-emerald-300";
    default:
      return "text-slate-800 dark:text-slate-200";
  }
}
