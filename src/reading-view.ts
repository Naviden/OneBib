import { CITATION_PATTERN, formatCitationGroup, formatReference, splitCitationKeys } from "./citations";
import type { BibEntry } from "./types";

const EXCLUDED_ANCESTORS = "code, pre, script, style, .onebib-citation";

export function renderCitationMarkers(
  container: HTMLElement,
  entries: ReadonlyMap<string, BibEntry>,
): void {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    if (current.instanceOf(Text) && current.data.includes(">>")) nodes.push(current);
  }

  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest(EXCLUDED_ANCESTORS)) continue;
    replaceCitationsInTextNode(node, entries);
  }
}

function replaceCitationsInTextNode(node: Text, entries: ReadonlyMap<string, BibEntry>): void {
  const source = node.data;
  CITATION_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  let cursor = 0;
  let changed = false;
  const fragment = createFragment();

  while ((match = CITATION_PATTERN.exec(source))) {
    changed = true;
    fragment.append(source.slice(cursor, match.index));
    const keys = splitCitationKeys(match[1] ?? "");
    const citation = formatCitationGroup(keys, entries);
    const span = createSpan();
    span.className = "onebib-citation";
    if (citation.missing.length > 0) span.classList.add("is-missing");
    span.textContent = citation.text;
    span.dataset.onebibKeys = keys.join(";");
    span.setAttribute("aria-label", tooltipForKeys(keys, entries));
    fragment.append(span);
    cursor = match.index + match[0].length;
  }

  if (!changed) return;
  fragment.append(source.slice(cursor));
  node.replaceWith(fragment);
}

function tooltipForKeys(keys: string[], entries: ReadonlyMap<string, BibEntry>): string {
  return keys
    .map((key) => {
      const entry = entries.get(key);
      return entry ? formatReference(entry) : `Missing BibTeX entry: ${key}`;
    })
    .join("\n");
}
