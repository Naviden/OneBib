import { describe, expect, it } from "vitest";
import { REFERENCES_END, REFERENCES_START, updateManagedReferences } from "../src/bibliography";
import type { BibEntry } from "../src/types";

const entries = new Map<string, BibEntry>([
  [
    "zeta",
    {
      type: "book",
      key: "zeta",
      fields: { author: "Zulu, Zoe", title: "The Z book", year: "2020", publisher: "Press" },
    },
  ],
  [
    "alpha",
    {
      type: "article",
      key: "alpha",
      fields: { author: "Able, Ann", title: "An article", year: "2024", journal: "Journal" },
    },
  ],
]);

describe("managed references", () => {
  it("appends cited references alphabetically", () => {
    const result = updateManagedReferences("Text >>zeta<< and >>alpha<<.\n", entries);
    expect(result.changed).toBe(true);
    expect(result.markdown).toContain(`${REFERENCES_START}\n## References`);
    expect(result.markdown.indexOf("Able, A.")).toBeLessThan(result.markdown.indexOf("Zulu, Z."));
    expect(result.markdown).toContain(REFERENCES_END);
  });

  it("replaces an existing managed block without duplicating it", () => {
    const original = `Text >>alpha<<.\n\n${REFERENCES_START}\nold\n${REFERENCES_END}\n`;
    const result = updateManagedReferences(original, entries);
    expect(result.markdown.match(new RegExp(REFERENCES_START, "g"))).toHaveLength(1);
    expect(result.markdown).not.toContain("old");
  });

  it("reports missing keys and excludes them from references", () => {
    const original = "Text >>missing<<.";
    const result = updateManagedReferences(original, entries);
    expect(result.missingKeys).toEqual(["missing"]);
    expect(result.markdown).toBe(original);
    expect(result.changed).toBe(false);
  });

  it("does not touch notes without citations", () => {
    const original = "An ordinary note without a final newline.";
    expect(updateManagedReferences(original, entries)).toMatchObject({
      markdown: original,
      changed: false,
      citedKeys: [],
    });
  });
});
