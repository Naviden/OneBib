import { EditorView } from "@codemirror/view";
import {
  type Editor,
  MarkdownView,
  Notice,
  Plugin,
  TFile,
  normalizePath,
} from "obsidian";
import { updateManagedReferences } from "./bibliography";
import { bibliographyRefreshEffect, createCitationEditorExtension } from "./editor-extension";
import { formatCitationMarkerForInsertion } from "./citations";
import { BibliographyLibrary } from "./library";
import { renderCitationMarkers } from "./reading-view";
import { OneBibSettingTab } from "./settings";
import { BibliographyPickerModal, CitationEditorSuggest, CitationPickerModal } from "./suggest";
import { DEFAULT_SETTINGS, type OneBibSettings } from "./types";

interface ReloadOptions {
  notify?: boolean;
  updateNotes?: boolean;
}

export default class OneBibPlugin extends Plugin {
  settings!: OneBibSettings;
  library!: BibliographyLibrary;

  private readonly noteTimers = new Map<string, number>();
  private bibliographyTimer: number | null = null;
  private readonly updatingPaths = new Set<string>();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.library = new BibliographyLibrary(this.app);

    this.addSettingTab(new OneBibSettingTab(this.app, this));
    this.registerEditorSuggest(new CitationEditorSuggest(this.app, () => this.library.values()));
    this.registerEditorExtension(createCitationEditorExtension(() => this.library.entries));
    this.registerMarkdownPostProcessor((element) => renderCitationMarkers(element, this.library.entries));

    this.addCommand({
      id: "insert-citation",
      name: "Insert citation",
      editorCallback: (editor) => this.openCitationPicker(editor),
    });

    this.addCommand({
      id: "update-references",
      name: "Update references in current note",
      editorCheckCallback: (checking, _editor, view) => {
        if (!(view.file instanceof TFile)) return false;
        if (!checking) void this.updateNoteReferences(view.file, true);
        return true;
      },
    });

    this.addCommand({
      id: "choose-bibliography",
      name: "Choose bibliography file",
      callback: () => this.openBibliographyPicker(),
    });

    this.addCommand({
      id: "reload-bibliography",
      name: "Reload bibliography",
      callback: () => void this.reloadBibliography({ notify: true, updateNotes: true }),
    });

    this.addRibbonIcon("book-open", "Insert citation", () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) {
        new Notice("Open a Markdown note before inserting a citation.");
        return;
      }
      this.openCitationPicker(view.editor);
    });

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (!(file instanceof TFile) || this.updatingPaths.has(file.path)) return;
        if (normalizePath(file.path) === normalizePath(this.settings.bibliographyPath)) {
          this.scheduleBibliographyReload();
        } else if (file.extension.toLowerCase() === "md" && this.settings.autoUpdateReferences) {
          this.scheduleNoteUpdate(file);
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (!(file instanceof TFile) || file.extension.toLowerCase() !== "bib") return;
        if (normalizePath(oldPath) !== normalizePath(this.settings.bibliographyPath)) return;
        this.settings.bibliographyPath = file.path;
        void this.saveSettings();
      }),
    );

    this.app.workspace.onLayoutReady(() => {
      void this.reloadBibliography({ notify: false, updateNotes: false });
    });
  }

  onunload(): void {
    for (const timer of this.noteTimers.values()) window.clearTimeout(timer);
    if (this.bibliographyTimer !== null) window.clearTimeout(this.bibliographyTimer);
  }

  async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as unknown;
    this.settings = readSettings(stored);
  }

  async saveSettings(reload = true): Promise<void> {
    await this.saveData(this.settings);
    if (reload) await this.reloadBibliography({ notify: false, updateNotes: true });
  }

  async reloadBibliography(options: ReloadOptions = {}): Promise<void> {
    await this.discoverSoleBibliography();
    const count = await this.library.load(this.settings.bibliographyPath);
    this.refreshRenderedCitations();

    if (options.updateNotes && this.settings.autoUpdateReferences && this.library.isLoaded) {
      await this.updateAllReferencedNotes();
    }

    if (options.notify) {
      if (!this.settings.bibliographyPath) {
        new Notice("Open the plugin settings and choose a bibliography file.");
      } else if (this.library.warnings.length > 0) {
        new Notice(`Loaded ${count} entries with ${this.library.warnings.length} warning(s).`);
      } else {
        new Notice(`Loaded ${count} BibTeX ${count === 1 ? "entry" : "entries"}.`);
      }
    }
  }

  openBibliographyPicker(): void {
    const files = this.getBibliographyFiles();
    if (files.length === 0) {
      new Notice("Add a .bib file to this vault first.");
      return;
    }
    new BibliographyPickerModal(this.app, files, (file) => {
      this.settings.bibliographyPath = file.path;
      void this.saveSettings();
    }).open();
  }

  getLibraryStatus(): string {
    if (!this.settings.bibliographyPath) return "No BibTeX file selected.";
    const warningText = this.library.warnings.length > 0 ? ` ${this.library.warnings.length} warning(s).` : "";
    return `${this.library.entries.size} entries loaded from ${this.settings.bibliographyPath}.${warningText}`;
  }

  private openCitationPicker(editor: Editor): void {
    const entries = this.library.values();
    if (entries.length === 0) {
      new Notice("No bibliography entries loaded. Choose a bibliography file first.");
      return;
    }
    new CitationPickerModal(this.app, entries, (entry) => {
      const selectionEnd = editor.getCursor("to");
      const followingText = editor.getLine(selectionEnd.line).slice(selectionEnd.ch);
      editor.replaceSelection(formatCitationMarkerForInsertion(entry.key, followingText));
    }).open();
  }

  private getBibliographyFiles(): TFile[] {
    return this.app.vault
      .getFiles()
      .filter((file) => file.extension.toLowerCase() === "bib")
      .sort((left, right) => left.path.localeCompare(right.path));
  }

  private async discoverSoleBibliography(): Promise<void> {
    if (this.settings.bibliographyPath) return;
    const files = this.getBibliographyFiles();
    if (files.length !== 1 || !files[0]) return;
    this.settings.bibliographyPath = files[0].path;
    await this.saveData(this.settings);
  }

  private scheduleBibliographyReload(): void {
    if (this.bibliographyTimer !== null) window.clearTimeout(this.bibliographyTimer);
    this.bibliographyTimer = window.setTimeout(() => {
      this.bibliographyTimer = null;
      void this.reloadBibliography({ notify: false, updateNotes: true });
    }, 500);
  }

  private scheduleNoteUpdate(file: TFile): void {
    const previous = this.noteTimers.get(file.path);
    if (previous !== undefined) window.clearTimeout(previous);
    const timer = window.setTimeout(() => {
      this.noteTimers.delete(file.path);
      void this.updateNoteReferences(file, false);
    }, 800);
    this.noteTimers.set(file.path, timer);
  }

  private async updateAllReferencedNotes(): Promise<void> {
    const markdownFiles = this.app.vault.getMarkdownFiles();
    for (const file of markdownFiles) await this.updateNoteReferences(file, false);
  }

  private async updateNoteReferences(file: TFile, notify: boolean): Promise<void> {
    if (!this.settings.bibliographyPath || !this.library.isLoaded) {
      if (notify) new Notice("Load a valid bibliography file first.");
      return;
    }

    const current = await this.app.vault.cachedRead(file);
    const preview = updateManagedReferences(current, this.library.entries, this.settings.referenceHeading);
    if (!preview.changed) {
      if (notify) new Notice("References are already up to date.");
      return;
    }

    this.updatingPaths.add(file.path);
    let missingKeys: string[] = [];
    try {
      await this.app.vault.process(file, (latest) => {
        const update = updateManagedReferences(latest, this.library.entries, this.settings.referenceHeading);
        missingKeys = update.missingKeys;
        return update.markdown;
      });
    } finally {
      this.updatingPaths.delete(file.path);
    }

    if (notify) {
      const suffix = missingKeys.length > 0 ? ` Missing: ${missingKeys.join(", ")}.` : "";
      new Notice(`References updated.${suffix}`);
    }
  }

  private refreshRenderedCitations(): void {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!(leaf.view instanceof MarkdownView)) return;
      const view = leaf.view;
      // Obsidian's Editor interface intentionally does not expose CodeMirror.
      // @ts-expect-error The underlying CM6 view is present in modern Obsidian.
      const editorView = view.editor.cm as EditorView | undefined;
      editorView?.dispatch({ effects: bibliographyRefreshEffect.of(this.library.generation) });
      view.previewMode.rerender(true);
    });
  }
}

function readSettings(stored: unknown): OneBibSettings {
  if (!isRecord(stored)) return { ...DEFAULT_SETTINGS };
  return {
    bibliographyPath:
      typeof stored.bibliographyPath === "string" ? stored.bibliographyPath.trim() : DEFAULT_SETTINGS.bibliographyPath,
    autoUpdateReferences:
      typeof stored.autoUpdateReferences === "boolean"
        ? stored.autoUpdateReferences
        : DEFAULT_SETTINGS.autoUpdateReferences,
    referenceHeading:
      typeof stored.referenceHeading === "string" && stored.referenceHeading.trim()
        ? stored.referenceHeading.trim()
        : DEFAULT_SETTINGS.referenceHeading,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
