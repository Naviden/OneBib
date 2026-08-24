import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder, StateEffect, type Extension } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { editorLivePreviewField } from "obsidian";
import { CITATION_PATTERN, formatCitationGroup, formatReference, splitCitationKeys } from "./citations";
import type { BibEntry } from "./types";

export const bibliographyRefreshEffect = StateEffect.define<number>();

export function createCitationEditorExtension(
  getEntries: () => ReadonlyMap<string, BibEntry>,
): Extension {
  class CitationViewPlugin implements PluginValue {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view, getEntries());
    }

    update(update: ViewUpdate): void {
      const bibliographyChanged = update.transactions.some((transaction) =>
        transaction.effects.some((effect) => effect.is(bibliographyRefreshEffect)),
      );
      if (update.docChanged || update.viewportChanged || update.selectionSet || bibliographyChanged) {
        this.decorations = buildDecorations(update.view, getEntries());
      }
    }
  }

  return ViewPlugin.fromClass(CitationViewPlugin, {
    decorations: (plugin) => plugin.decorations,
  });
}

class CitationWidget extends WidgetType {
  constructor(
    private readonly keys: string[],
    private readonly text: string,
    private readonly missing: string[],
    private readonly entries: ReadonlyMap<string, BibEntry>,
  ) {
    super();
  }

  eq(other: CitationWidget): boolean {
    return this.keys.join(";") === other.keys.join(";") && this.text === other.text;
  }

  toDOM(): HTMLElement {
    const span = createSpan();
    span.className = "onebib-citation";
    if (this.missing.length > 0) span.classList.add("is-missing");
    span.textContent = this.text;
    span.dataset.onebibKeys = this.keys.join(";");
    span.setAttribute(
      "aria-label",
      this.keys
        .map((key) => {
          const entry = this.entries.get(key);
          return entry ? formatReference(entry) : `Missing BibTeX entry: ${key}`;
        })
        .join("\n"),
    );
    return span;
  }
}

function buildDecorations(
  view: EditorView,
  entries: ReadonlyMap<string, BibEntry>,
): DecorationSet {
  if (!view.state.field(editorLivePreviewField, false)) return Decoration.none;

  const builder = new RangeSetBuilder<Decoration>();
  const visitedLines = new Set<number>();

  for (const range of view.visibleRanges) {
    const firstLine = view.state.doc.lineAt(range.from).number;
    const lastLine = view.state.doc.lineAt(range.to).number;
    for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber += 1) {
      if (visitedLines.has(lineNumber)) continue;
      visitedLines.add(lineNumber);
      const line = view.state.doc.line(lineNumber);
      CITATION_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = CITATION_PATTERN.exec(line.text))) {
        const from = line.from + match.index;
        const to = from + match[0].length;
        if (selectionTouchesRange(view, from, to) || isExcludedSyntax(view, from)) continue;
        const keys = splitCitationKeys(match[1] ?? "");
        const citation = formatCitationGroup(keys, entries);
        builder.add(
          from,
          to,
          Decoration.replace({
            widget: new CitationWidget(keys, citation.text, citation.missing, entries),
          }),
        );
      }
    }
  }

  return builder.finish();
}

function selectionTouchesRange(view: EditorView, from: number, to: number): boolean {
  return view.state.selection.ranges.some((range) => range.to >= from && range.from <= to);
}

function isExcludedSyntax(view: EditorView, position: number): boolean {
  let node = syntaxTree(view.state).resolveInner(position, 1);
  while (node) {
    const name = node.type.name.toLowerCase();
    if (name.includes("code") || name.includes("frontmatter") || name.includes("html")) return true;
    if (!node.parent) break;
    node = node.parent;
  }
  return false;
}
