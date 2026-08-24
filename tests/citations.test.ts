import { describe, expect, it } from "vitest";
import {
  extractCitationKeys,
  formatCitation,
  formatCitationGroup,
  formatCitationMarkerForInsertion,
  formatReference,
  parseAuthors,
  shouldAddSafetySpaceForClosingInput,
} from "../src/citations";
import type { BibEntry } from "../src/types";

const article: BibEntry = {
  type: "article",
  key: "cambria2023survey",
  fields: {
    title: "A survey on XAI and natural language explanations",
    author: "Cambria, Erik and Malandri, Lorenzo and Mercorio, Fabio and Mezzanzanica, Mario and Nobani, Navid",
    journal: "Information Processing & Management",
    volume: "60",
    number: "1",
    pages: "103111",
    year: "2023",
    doi: "10.1016/j.ipm.2022.103111",
  },
};

describe("citation formatting", () => {
  it("uses author-year shorthand", () => {
    expect(formatCitation(article)).toBe("Cambria et al., 2023");
  });

  it("renders missing citation keys visibly", () => {
    const entries = new Map([[article.key, article]]);
    expect(formatCitationGroup([article.key, "missing"], entries)).toEqual({
      text: "(Cambria et al., 2023; ?missing?)",
      missing: ["missing"],
    });
  });

  it("extracts unique keys in first-use order", () => {
    expect(extractCitationKeys("A >>first<< B >>second; first<< C")).toEqual(["first", "second"]);
  });

  it("formats an APA-like article reference", () => {
    expect(formatReference(article)).toBe(
      "Cambria, E., Malandri, L., Mercorio, F., Mezzanzanica, M., & Nobani, N. (2023). A survey on XAI and natural language explanations. Information Processing & Management, 60(1), 103111. https://doi.org/10.1016/j.ipm.2022.103111",
    );
  });
});

describe("citation safety spacing", () => {
  it("adds a trailing space when inserting before text or at the end of a line", () => {
    expect(formatCitationMarkerForInsertion("mao2018", "which follows")).toBe(">>mao2018<< ");
    expect(formatCitationMarkerForInsertion("mao2018")).toBe(">>mao2018<< ");
  });

  it("does not add another space before whitespace or punctuation", () => {
    expect(formatCitationMarkerForInsertion("mao2018", " already spaced")).toBe(">>mao2018<<");
    expect(formatCitationMarkerForInsertion("mao2018", ".")).toBe(">>mao2018<<");
  });

  it("adds the safety space when a user manually types the second closing angle bracket", () => {
    expect(shouldAddSafetySpaceForClosingInput(">>mao2018<", "<")).toBe(true);
    expect(shouldAddSafetySpaceForClosingInput(">>first; second<", "<", "word")).toBe(true);
    expect(shouldAddSafetySpaceForClosingInput(">>mao2018<", "<", ".")).toBe(false);
    expect(shouldAddSafetySpaceForClosingInput("ordinary text <", "<")).toBe(false);
  });
});

describe("author parsing", () => {
  it("supports BibTeX first-last and last-first forms", () => {
    expect(parseAuthors("Ludwig van Beethoven and Smith, Jr., John")).toEqual([
      { family: "van Beethoven", given: "Ludwig", suffix: "" },
      { family: "Smith", given: "John", suffix: "Jr." },
    ]);
  });
});
