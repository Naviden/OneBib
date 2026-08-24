import { describe, expect, it } from "vitest";
import { cleanBibTeX, parseBibTeX } from "../src/bibtex";

describe("parseBibTeX", () => {
  it("parses the motivating article entry", () => {
    const source = String.raw`
      @article{cambria2023survey,
        title={A survey on {XAI} and natural language explanations},
        author={Cambria, Erik and Malandri, Lorenzo and Mercorio, Fabio and Mezzanzanica, Mario and Nobani, Navid},
        journal={Information Processing \& Management},
        volume={60},
        number={1},
        pages={103111},
        year={2023},
        publisher={Elsevier}
      }
    `;

    const result = parseBibTeX(source);
    expect(result.warnings).toEqual([]);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      type: "article",
      key: "cambria2023survey",
      fields: {
        title: "A survey on XAI and natural language explanations",
        journal: "Information Processing & Management",
        year: "2023",
      },
    });
  });

  it("supports strings, quoted values, numeric values, and concatenation", () => {
    const source = String.raw`
      @string{venue = "International Conference on "}
      @inproceedings(test2025,
        title = "A " # {Nested {Title}},
        booktitle = venue # "Learning Representations",
        year = 2025
      )
    `;

    const result = parseBibTeX(source);
    expect(result.warnings).toEqual([]);
    expect(result.entries[0]?.fields).toMatchObject({
      title: "A Nested Title",
      booktitle: "International Conference on Learning Representations",
      year: "2025",
    });
  });

  it("recovers after a malformed entry", () => {
    const result = parseBibTeX("@article{broken, title } @book{good, title={Good}, year={2020}}");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.entries.map((entry) => entry.key)).toEqual(["good"]);
  });
});

describe("cleanBibTeX", () => {
  it("cleans common LaTeX escapes", () => {
    expect(cleanBibTeX(String.raw`M{\"o}ller \& Garc{\'i}a--Lopez`)).toBe("Möller & García–Lopez");
  });
});
