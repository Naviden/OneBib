# Changelog

All notable changes to OneBib are documented in this file.

## 1.0.2 - 2026-08-24

### Added

- Import a `.bib` file directly with the system file picker; OneBib copies it into the vault, selects it, and loads it immediately.

### Fixed

- Open the import picker instead of showing a dead-end message when the vault contains no detected `.bib` files.

## 1.0.1 - 2026-08-24

### Fixed

- Add a safety space after a closing `<<` when needed so following text is not parsed as HTML-like markup in Live Preview.

## 1.0.0 - 2026-08-24

### Added

- Local parsing of a single BibTeX file stored inside the vault.
- Inline `>>citationKey<<` markers rendered as APA-like author–year citations.
- Citation-key autocomplete and a searchable insertion command.
- Automatic, alphabetized reference sections containing only cited works.
- Multiple citations with `>>firstKey; secondKey<<`.
- Clear rendering for missing citation keys.
- Automatic refresh after the bibliography file changes.
- Desktop and mobile support with no accounts, telemetry, or network access.
- Searchable declarative settings on Obsidian 1.13 and later, with a compatible settings interface on Obsidian 1.5 through 1.12.
