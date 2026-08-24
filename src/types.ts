export interface BibEntry {
  type: string;
  key: string;
  fields: Record<string, string>;
}

export interface ParsedBibliography {
  entries: BibEntry[];
  warnings: string[];
}

export interface OneBibSettings {
  bibliographyPath: string;
  autoUpdateReferences: boolean;
  referenceHeading: string;
}

export const DEFAULT_SETTINGS: OneBibSettings = {
  bibliographyPath: "",
  autoUpdateReferences: true,
  referenceHeading: "References",
};
