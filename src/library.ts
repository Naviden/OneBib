import { App, TFile, normalizePath } from "obsidian";
import { parseBibTeX } from "./bibtex";
import type { BibEntry } from "./types";

export class BibliographyLibrary {
  entries: ReadonlyMap<string, BibEntry> = new Map();
  warnings: string[] = [];
  generation = 0;
  isLoaded = false;

  constructor(private readonly app: App) {}

  async load(path: string): Promise<number> {
    const normalized = normalizePath(path.trim());
    if (!normalized) {
      this.replace([], [], false);
      return 0;
    }

    const file = this.app.vault.getAbstractFileByPath(normalized);
    if (!(file instanceof TFile) || file.extension.toLowerCase() !== "bib") {
      this.replace([], [`Bibliography file not found: ${normalized}`], false);
      return 0;
    }

    const source = await this.app.vault.cachedRead(file);
    const parsed = parseBibTeX(source);
    this.replace(parsed.entries, parsed.warnings, true);
    return parsed.entries.length;
  }

  get(key: string): BibEntry | undefined {
    return this.entries.get(key);
  }

  values(): BibEntry[] {
    return [...this.entries.values()];
  }

  private replace(entries: BibEntry[], warnings: string[], isLoaded: boolean): void {
    const next = new Map<string, BibEntry>();
    const duplicateWarnings: string[] = [];
    for (const entry of entries) {
      if (next.has(entry.key)) duplicateWarnings.push(`Duplicate citation key: ${entry.key}`);
      next.set(entry.key, entry);
    }
    this.entries = next;
    this.warnings = [...warnings, ...duplicateWarnings];
    this.isLoaded = isLoaded;
    this.generation += 1;
  }
}
