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
  if (lang === "shell" || lang === "bash" || lang === "sh") return tokenizeShell(code);
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

function tokenizeShell(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let atLineStart = true;
  let sawCommand = false;

  while (i < code.length) {
    const ch = code[i]!;

    if (ch === "\n") {
      tokens.push({ type: "text", value: ch });
      i += 1;
      atLineStart = true;
      sawCommand = false;
      continue;
    }

    if (ch === " " || ch === "\t") {
      let j = i;
      while (j < code.length && (code[j] === " " || code[j] === "\t")) j++;
      tokens.push({ type: "text", value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === "#") {
      let j = i;
      while (j < code.length && code[j] !== "\n") j++;
      tokens.push({ type: "comment", value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === "\\") j++;
        j++;
      }
      tokens.push({ type: "string", value: code.slice(i, Math.min(j + 1, code.length)) });
      i = j + 1;
      atLineStart = false;
      continue;
    }

    if (ch === "$" && code[i + 1] === "{") {
      let j = i + 2;
      let depth = 1;
      while (j < code.length && depth > 0) {
        if (code[j] === "{") depth++;
        else if (code[j] === "}") depth--;
        if (depth === 0) break;
        j++;
      }
      tokens.push({ type: "type", value: code.slice(i, Math.min(j + 1, code.length)) });
      i = j + 1;
      atLineStart = false;
      continue;
    }

    if (ch === "$" && /[a-zA-Z_]/.test(code[i + 1] ?? "")) {
      let j = i + 1;
      while (j < code.length && /[a-zA-Z0-9_]/.test(code[j]!)) j++;
      tokens.push({ type: "type", value: code.slice(i, j) });
      i = j;
      atLineStart = false;
      continue;
    }

    if (ch === "&" && code[i + 1] === "&") {
      tokens.push({ type: "punct", value: "&&" });
      i += 2;
      atLineStart = true;
      sawCommand = false;
      continue;
    }
    if (ch === "|" && code[i + 1] === "|") {
      tokens.push({ type: "punct", value: "||" });
      i += 2;
      atLineStart = true;
      sawCommand = false;
      continue;
    }
    if (ch === "|" || ch === ";" || ch === ">" || ch === "<") {
      tokens.push({ type: "punct", value: ch });
      i += 1;
      atLineStart = true;
      sawCommand = false;
      continue;
    }
    if (ch === "\\") {
      tokens.push({ type: "punct", value: ch });
      i += 1;
      continue;
    }

    if (ch === "-") {
      let j = i;
      while (j < code.length && /[A-Za-z0-9_-]/.test(code[j]!)) j++;
      const word = code.slice(i, j);
      if (word.length > 1 && (word.startsWith("-") || word.startsWith("--"))) {
        tokens.push({ type: "attr", value: word });
        i = j;
        atLineStart = false;
        continue;
      }
    }

    if (/[A-Za-z0-9_@./~:=]/.test(ch)) {
      let j = i;
      while (j < code.length && /[A-Za-z0-9_@./~:=+-]/.test(code[j]!)) j++;
      const word = code.slice(i, j);
      let type: TokenType;
      if (atLineStart && !sawCommand) {
        type = "keyword";
        sawCommand = true;
      } else if (word.startsWith("@") || word.startsWith("/") || word.startsWith("./") || word.startsWith("~/")) {
        type = "string";
      } else if (word.includes("=")) {
        type = "attr";
      } else {
        type = "text";
      }
      tokens.push({ type, value: word });
      i = j;
      atLineStart = false;
      continue;
    }

    tokens.push({ type: "punct", value: ch });
    i += 1;
  }

  return tokens;
}

export function tokenClass(type: TokenType): string {
  switch (type) {
    case "text":
      return "text-[var(--wire-code-token-text)]";
    case "punct":
      return "text-[var(--wire-code-token-punct)]";
    case "key":
      return "text-[var(--wire-code-token-key)]";
    case "string":
      return "text-[var(--wire-code-token-string)]";
    case "number":
      return "text-[var(--wire-code-token-number)]";
    case "boolean":
      return "text-[var(--wire-code-token-boolean)]";
    case "keyword":
      return "text-[var(--wire-code-token-keyword)]";
    case "comment":
      return "italic text-[var(--wire-code-token-comment)]";
    case "type":
      return "text-[var(--wire-code-token-type)]";
    case "tag":
      return "text-[var(--wire-code-token-tag)]";
    case "attr":
      return "text-[var(--wire-code-token-attr)]";
    case "regex":
      return "text-[var(--wire-code-token-string)]";
    default:
      return "text-[var(--wire-code-token-text)]";
  }
}
