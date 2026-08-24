import { describe, expect, it } from "vitest";
import { findAvailableBibliographyPath, sanitizeBibliographyFileName } from "../src/bibliography-file";

describe("bibliography file imports", () => {
  it("sanitizes a selected file name and keeps the BibTeX extension", () => {
    expect(sanitizeBibliographyFileName("folder/My:Library.BIB")).toBe("My-Library.bib");
    expect(sanitizeBibliographyFileName(".bib")).toBe("bibliography.bib");
  });

  it("chooses a non-destructive path when the file already exists", () => {
    const existing = new Set(["library.bib", "library-2.bib"]);
    expect(findAvailableBibliographyPath("library.bib", (path) => existing.has(path))).toBe("library-3.bib");
  });
});
