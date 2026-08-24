import {
  type App,
  type Editor,
  EditorSuggest,
  type EditorSuggestContext,
  type EditorSuggestTriggerInfo,
  FuzzySuggestModal,
  type TFile,
} from "obsidian";
import { formatCitation, parseAuthors } from "./citations";
import type { BibEntry } from "./types";

export class CitationEditorSuggest extends EditorSuggest<BibEntry> {
  constructor(
    app: App,
    private readonly getEntries: () => BibEntry[],
  ) {
    super(app);
  }

  onTrigger(cursor: { line: number; ch: number }, editor: Editor): EditorSuggestTriggerInfo | null {
    const beforeCursor = editor.getLine(cursor.line).slice(0, cursor.ch);
    const match = beforeCursor.match(/>>([A-Za-z0-9_:.+\-/]*)$/);
    if (!match) return null;
    return {
      start: { line: cursor.line, ch: cursor.ch - match[0].length },
      end: cursor,
      query: match[1] ?? "",
    };
  }

  getSuggestions(context: EditorSuggestContext): BibEntry[] {
    const query = context.query.toLocaleLowerCase();
    return this.getEntries()
      .filter((entry) => searchableText(entry).includes(query))
      .sort((left, right) => rankEntry(left, query) - rankEntry(right, query) || left.key.localeCompare(right.key))
      .slice(0, 50);
  }

  renderSuggestion(entry: BibEntry, element: HTMLElement): void {
    renderEntrySuggestion(entry, element);
  }

  selectSuggestion(entry: BibEntry): void {
    const context = this.context;
    if (!context) return;
    context.editor.replaceRange(`>>${entry.key}<<`, context.start, context.end);
  }
}

export class CitationPickerModal extends FuzzySuggestModal<BibEntry> {
  constructor(
    app: App,
    private readonly entries: BibEntry[],
    private readonly onChoose: (entry: BibEntry) => void,
  ) {
    super(app);
    this.setPlaceholder("Search by citation key, author, or title...");
  }

  getItems(): BibEntry[] {
    return this.entries;
  }

  getItemText(entry: BibEntry): string {
    return searchableText(entry);
  }

  renderSuggestion(match: { item: BibEntry }, element: HTMLElement): void {
    renderEntrySuggestion(match.item, element);
  }

  onChooseItem(entry: BibEntry): void {
    this.onChoose(entry);
  }
}

export class BibliographyPickerModal extends FuzzySuggestModal<TFile> {
  constructor(
    app: App,
    private readonly files: TFile[],
    private readonly onChoose: (file: TFile) => void,
  ) {
    super(app);
    this.setPlaceholder("Choose a bibliography file from this vault...");
  }

  getItems(): TFile[] {
    return this.files;
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }
}

function renderEntrySuggestion(entry: BibEntry, element: HTMLElement): void {
  element.addClass("onebib-suggestion");
  element.createDiv({ cls: "onebib-suggestion-key", text: entry.key });
  const authors = parseAuthors(entry.fields.author ?? entry.fields.editor ?? "");
  const lead = authors[0]?.family ?? entry.fields.organization ?? "Unknown author";
  const authorLabel = authors.length > 1 ? `${lead} et al.` : lead;
  const year = entry.fields.year ?? "n.d.";
  element.createDiv({
    cls: "onebib-suggestion-meta",
    text: `${formatCitation(entry)} — ${entry.fields.title ?? `${authorLabel}, ${year}`}`,
  });
}

function searchableText(entry: BibEntry): string {
  return [entry.key, entry.fields.author, entry.fields.editor, entry.fields.title, entry.fields.year]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function rankEntry(entry: BibEntry, query: string): number {
  if (!query) return 2;
  const key = entry.key.toLocaleLowerCase();
  if (key === query) return 0;
  if (key.startsWith(query)) return 1;
  return 2;
}
