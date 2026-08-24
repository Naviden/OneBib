import type { BibEntry, ParsedBibliography } from "./types";

const MONTHS: Record<string, string> = {
  jan: "January",
  feb: "February",
  mar: "March",
  apr: "April",
  may: "May",
  jun: "June",
  jul: "July",
  aug: "August",
  sep: "September",
  oct: "October",
  nov: "November",
  dec: "December",
};

/**
 * A deliberately small, dependency-free BibTeX parser. It supports the forms
 * found in normal exported libraries: nested braces, quoted values, numeric
 * values, @string macros, and # concatenation.
 */
export function parseBibTeX(source: string): ParsedBibliography {
  const parser = new BibTeXParser(source);
  return parser.parse();
}

class BibTeXParser {
  private position = 0;
  private readonly entries: BibEntry[] = [];
  private readonly warnings: string[] = [];
  private readonly macros = new Map<string, string>(Object.entries(MONTHS));

  constructor(private readonly source: string) {}

  parse(): ParsedBibliography {
    while (this.position < this.source.length) {
      const at = this.source.indexOf("@", this.position);
      if (at === -1) break;
      this.position = at + 1;

      try {
        this.parseAtExpression();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.warnings.push(message);
        this.recoverToNextEntry();
      }
    }

    return { entries: this.entries, warnings: this.warnings };
  }

  private parseAtExpression(): void {
    this.skipWhitespace();
    const type = this.readIdentifier().toLowerCase();
    if (!type) throw this.error("Expected an entry type after '@'");

    this.skipWhitespace();
    const opener = this.peek();
    if (opener !== "{" && opener !== "(") {
      throw this.error(`Expected '{' or '(' after @${type}`);
    }
    this.position += 1;
    const closer = opener === "{" ? "}" : ")";

    if (type === "comment" || type === "preamble") {
      this.skipBalanced(opener, closer);
      return;
    }

    if (type === "string") {
      this.parseStringDefinition(closer);
      return;
    }

    this.skipWhitespace();
    const key = this.readUntilTopLevel([",", closer]).trim();
    if (!key) throw this.error(`Missing citation key in @${type}`);
    if (this.peek() === closer) {
      this.position += 1;
      this.entries.push({ type, key, fields: {} });
      return;
    }
    this.expect(",");

    const fields: Record<string, string> = {};
    while (this.position < this.source.length) {
      this.skipWhitespaceAndCommas();
      if (this.peek() === closer) {
        this.position += 1;
        break;
      }

      const field = this.readIdentifier().toLowerCase();
      if (!field) throw this.error(`Expected a field name in '${key}'`);
      this.skipWhitespace();
      this.expect("=");
      this.skipWhitespace();
      fields[field] = cleanBibTeX(this.readConcatenatedValue(closer));
      this.skipWhitespace();
      if (this.peek() === ",") this.position += 1;
    }

    this.entries.push({ type, key, fields });
  }

  private parseStringDefinition(closer: string): void {
    this.skipWhitespace();
    const name = this.readIdentifier().toLowerCase();
    this.skipWhitespace();
    this.expect("=");
    this.skipWhitespace();
    // Keep macro whitespace intact so `prefix # "suffix"` follows BibTeX's
    // exact concatenation semantics. The completed field is cleaned later.
    const value = this.readConcatenatedValue(closer);
    if (name) this.macros.set(name, value);
    this.skipWhitespaceAndCommas();
    if (this.peek() === closer) this.position += 1;
  }

  private readConcatenatedValue(entryCloser: string): string {
    const parts: string[] = [];
    while (this.position < this.source.length) {
      this.skipWhitespace();
      parts.push(this.readValuePart(entryCloser));
      this.skipWhitespace();
      if (this.peek() !== "#") break;
      this.position += 1;
    }
    return parts.join("");
  }

  private readValuePart(entryCloser: string): string {
    const current = this.peek();
    if (current === "{") return this.readBracedValue();
    if (current === '"') return this.readQuotedValue();

    const start = this.position;
    while (this.position < this.source.length) {
      const char = this.peek();
      if (char === "," || char === "#" || char === entryCloser || /\s/.test(char)) break;
      this.position += 1;
    }
    const token = this.source.slice(start, this.position).trim();
    if (!token) throw this.error("Expected a BibTeX value");
    return this.macros.get(token.toLowerCase()) ?? token;
  }

  private readBracedValue(): string {
    this.expect("{");
    let depth = 1;
    let value = "";
    while (this.position < this.source.length && depth > 0) {
      const char = this.peek();
      this.position += 1;

      if (char === "\\" && this.position < this.source.length) {
        value += char + this.peek();
        this.position += 1;
      } else if (char === "{") {
        depth += 1;
        value += char;
      } else if (char === "}") {
        depth -= 1;
        if (depth > 0) value += char;
      } else {
        value += char;
      }
    }
    if (depth !== 0) throw this.error("Unclosed braced value");
    return value;
  }

  private readQuotedValue(): string {
    this.expect('"');
    let value = "";
    while (this.position < this.source.length) {
      const char = this.peek();
      this.position += 1;
      if (char === "\\" && this.position < this.source.length) {
        value += char + this.peek();
        this.position += 1;
      } else if (char === '"') {
        return value;
      } else {
        value += char;
      }
    }
    throw this.error("Unclosed quoted value");
  }

  private skipBalanced(opener: string, closer: string): void {
    let depth = 1;
    while (this.position < this.source.length && depth > 0) {
      const char = this.peek();
      this.position += 1;
      if (char === "\\") this.position += 1;
      else if (char === opener) depth += 1;
      else if (char === closer) depth -= 1;
    }
  }

  private readUntilTopLevel(stoppers: string[]): string {
    const start = this.position;
    while (this.position < this.source.length && !stoppers.includes(this.peek())) {
      this.position += 1;
    }
    return this.source.slice(start, this.position);
  }

  private readIdentifier(): string {
    const start = this.position;
    while (/[A-Za-z0-9_:\-.]/.test(this.peek())) this.position += 1;
    return this.source.slice(start, this.position);
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.peek())) this.position += 1;
  }

  private skipWhitespaceAndCommas(): void {
    while (/\s|,/.test(this.peek())) this.position += 1;
  }

  private expect(expected: string): void {
    if (this.peek() !== expected) throw this.error(`Expected '${expected}'`);
    this.position += 1;
  }

  private peek(): string {
    return this.source[this.position] ?? "";
  }

  private recoverToNextEntry(): void {
    const next = this.source.indexOf("@", this.position);
    this.position = next === -1 ? this.source.length : next;
  }

  private error(message: string): Error {
    const line = this.source.slice(0, this.position).split("\n").length;
    return new Error(`${message} near line ${line}`);
  }
}

export function cleanBibTeX(value: string): string {
  const accents: Array<[RegExp, string]> = [
    [/\\'\{?a\}?/gi, "á"],
    [/\\'\{?e\}?/gi, "é"],
    [/\\'\{?i\}?/gi, "í"],
    [/\\'\{?o\}?/gi, "ó"],
    [/\\'\{?u\}?/gi, "ú"],
    [/\\"\{?a\}?/gi, "ä"],
    [/\\"\{?e\}?/gi, "ë"],
    [/\\"\{?i\}?/gi, "ï"],
    [/\\"\{?o\}?/gi, "ö"],
    [/\\"\{?u\}?/gi, "ü"],
    [/\\~\{?n\}?/gi, "ñ"],
    [/\\c\{?c\}?/gi, "ç"],
  ];

  let cleaned = value;
  for (const [pattern, replacement] of accents) cleaned = cleaned.replace(pattern, replacement);

  return cleaned
    .replace(/\\&/g, "&")
    .replace(/\\%/g, "%")
    .replace(/\\_/g, "_")
    .replace(/\\#/g, "#")
    .replace(/\\textendash\b/g, "–")
    .replace(/---/g, "—")
    .replace(/--/g, "–")
    .replace(/[{}]/g, "")
    .replace(/\\([A-Za-z]+)\s*/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}
