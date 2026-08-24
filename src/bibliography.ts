import { extractCitationKeys, formatReference, referenceSortKey } from "./citations";
import type { BibEntry } from "./types";

export const REFERENCES_START = "<!-- onebib:references:start -->";
export const REFERENCES_END = "<!-- onebib:references:end -->";

export interface BibliographyUpdate {
  markdown: string;
  changed: boolean;
  citedKeys: string[];
  missingKeys: string[];
}

export function updateManagedReferences(
  markdown: string,
  entries: ReadonlyMap<string, BibEntry>,
  heading = "References",
): BibliographyUpdate {
  const hadManagedBlock = markdown.includes(REFERENCES_START) && markdown.includes(REFERENCES_END);
  const withoutManagedBlock = removeManagedReferences(markdown);
  const citedKeys = extractCitationKeys(withoutManagedBlock);
  const missingKeys = citedKeys.filter((key) => !entries.has(key));
  const citedEntries = citedKeys
    .map((key) => entries.get(key))
    .filter((entry): entry is BibEntry => entry !== undefined)
    .sort((left, right) => referenceSortKey(left).localeCompare(referenceSortKey(right)));

  if (citedEntries.length === 0 && !hadManagedBlock) {
    return { markdown, changed: false, citedKeys, missingKeys };
  }

  let next = withoutManagedBlock.trimEnd();
  if (citedEntries.length > 0) {
    const safeHeading = heading.trim() || "References";
    const references = citedEntries.map((entry) => `1. ${escapeReferenceMarkdown(formatReference(entry))}`).join("\n");
    const block = [
      REFERENCES_START,
      `## ${safeHeading}`,
      "",
      references,
      REFERENCES_END,
    ].join("\n");
    next = `${next}\n\n${block}`;
  }
  next = `${next}\n`;

  return {
    markdown: next,
    changed: next !== markdown,
    citedKeys,
    missingKeys,
  };
}

export function removeManagedReferences(markdown: string): string {
  const start = markdown.indexOf(REFERENCES_START);
  if (start === -1) return markdown;
  const end = markdown.indexOf(REFERENCES_END, start + REFERENCES_START.length);
  if (end === -1) return markdown;
  return `${markdown.slice(0, start)}${markdown.slice(end + REFERENCES_END.length)}`
    .replace(/[ \t]+\n/g, "\n")
    .trimEnd();
}

function escapeReferenceMarkdown(reference: string): string {
  return reference
    .replace(/\\/g, "\\\\")
    .replace(/([*_`])/g, "\\$1")
    .replace(/^(\s*)([#>+-])/g, "$1\\$2");
}
