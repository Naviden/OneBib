import type { BibEntry } from "./types";

export const CITATION_PATTERN = />>\s*([A-Za-z0-9_:.+\-/]+(?:\s*;\s*[A-Za-z0-9_:.+\-/]+)*)\s*<</g;

export interface PersonName {
  family: string;
  given: string;
  suffix: string;
}

export function extractCitationKeys(markdown: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  CITATION_PATTERN.lastIndex = 0;
  for (const match of markdown.matchAll(CITATION_PATTERN)) {
    for (const key of splitCitationKeys(match[1] ?? "")) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }
  return keys;
}

export function splitCitationKeys(group: string): string[] {
  return group
    .split(";")
    .map((key) => key.trim())
    .filter(Boolean);
}

export function formatCitationGroup(
  keys: string[],
  entries: ReadonlyMap<string, BibEntry>,
): { text: string; missing: string[] } {
  const missing: string[] = [];
  const citations = keys.map((key) => {
    const entry = entries.get(key);
    if (!entry) {
      missing.push(key);
      return `?${key}?`;
    }
    return formatCitation(entry);
  });
  return { text: `(${citations.join("; ")})`, missing };
}

export function formatCitation(entry: BibEntry): string {
  const authors = parseAuthors(entry.fields.author ?? entry.fields.editor ?? "");
  const authorText = shortAuthorLabel(authors) || entry.fields.organization || entry.key;
  const year = entry.fields.year || "n.d.";
  return `${authorText}, ${year}`;
}

export function formatReference(entry: BibEntry): string {
  const fields = entry.fields;
  const people = parseAuthors(fields.author ?? fields.editor ?? "");
  const authors = formatReferenceAuthors(people) || fields.organization || entry.key;
  const year = fields.year || "n.d.";
  const title = ensureTerminalPunctuation(fields.title || "Untitled");
  const publication = formatPublication(entry);
  const doi = normalizeDoi(fields.doi ?? "");
  const url = doi || fields.url || "";

  return [
    ensureTerminalPunctuation(authors),
    `(${year}).`,
    title,
    publication,
    url,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function referenceSortKey(entry: BibEntry): string {
  const people = parseAuthors(entry.fields.author ?? entry.fields.editor ?? "");
  return `${people[0]?.family ?? entry.fields.organization ?? entry.key}\u0000${entry.fields.year ?? ""}\u0000${entry.key}`.toLocaleLowerCase();
}

export function parseAuthors(authorField: string): PersonName[] {
  if (!authorField.trim()) return [];
  return authorField
    .split(/\s+and\s+/i)
    .map((name) => parsePersonName(name.trim()))
    .filter((person) => person.family.length > 0);
}

function parsePersonName(rawName: string): PersonName {
  const name = rawName.replace(/^\{(.*)\}$/s, "$1").trim();
  const commaParts = name.split(",").map((part) => part.trim());
  if (commaParts.length >= 2) {
    return {
      family: commaParts[0] ?? "",
      suffix: commaParts.length >= 3 ? commaParts[1] ?? "" : "",
      given: commaParts.length >= 3 ? commaParts.slice(2).join(" ") : commaParts.slice(1).join(" "),
    };
  }

  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return { family: words[0] ?? "", given: "", suffix: "" };

  let familyStart = words.length - 1;
  while (familyStart > 0 && /^[a-z]/.test(words[familyStart - 1] ?? "")) familyStart -= 1;
  return {
    family: words.slice(familyStart).join(" "),
    given: words.slice(0, familyStart).join(" "),
    suffix: "",
  };
}

function shortAuthorLabel(authors: PersonName[]): string {
  if (authors.length === 0) return "";
  if (authors.length === 1) return authors[0]?.family ?? "";
  if (authors.length === 2) return `${authors[0]?.family} & ${authors[1]?.family}`;
  return `${authors[0]?.family} et al.`;
}

function formatReferenceAuthors(authors: PersonName[]): string {
  const names = authors.map((author) => {
    const initials = toInitials(author.given);
    return [author.family, author.suffix, initials].filter(Boolean).join(", ");
  });

  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
}

function toInitials(given: string): string {
  return given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toLocaleUpperCase()}.`)
    .join(" ");
}

function formatPublication(entry: BibEntry): string {
  const fields = entry.fields;
  if (entry.type === "article") {
    const journal = fields.journal ?? "";
    const volumeAndIssue = fields.volume
      ? `${fields.volume}${fields.number ? `(${fields.number})` : ""}`
      : "";
    const pages = normalizePages(fields.pages ?? fields.eid ?? "");
    return ensureTerminalPunctuation([journal, volumeAndIssue, pages].filter(Boolean).join(", "));
  }

  if (["inproceedings", "conference", "incollection"].includes(entry.type)) {
    const container = fields.booktitle ? `In ${fields.booktitle}` : "";
    const pages = fields.pages ? `(pp. ${normalizePages(fields.pages)})` : "";
    const publisher = fields.publisher ?? fields.organization ?? "";
    return ensureTerminalPunctuation([container, pages, publisher].filter(Boolean).join(". "));
  }

  if (["book", "inbook"].includes(entry.type)) {
    return ensureTerminalPunctuation(fields.publisher ?? fields.address ?? "");
  }

  return ensureTerminalPunctuation(
    fields.journal ?? fields.booktitle ?? fields.publisher ?? fields.institution ?? fields.school ?? "",
  );
}

function ensureTerminalPunctuation(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function normalizePages(value: string): string {
  return value.replace(/--/g, "–");
}

function normalizeDoi(value: string): string {
  const doi = value.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  return doi ? `https://doi.org/${doi}` : "";
}
