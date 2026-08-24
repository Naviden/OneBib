# OneBib 1.0.1

OneBib 1.0.1 fixes formatting immediately after inline citation markers in Live Preview.

## Highlights

- Adds one trailing safety space when OneBib inserts a citation at the end of a line or before adjoining text.
- Adds the same safety space when you manually type the second `<` in a closing citation marker.
- Avoids adding an unnecessary space when whitespace or punctuation already follows the marker.

## Installation

Download `onebib-1.0.1.zip` and extract it into `<vault>/.obsidian/plugins/onebib/`, or download `main.js`, `manifest.json`, and `styles.css` into that directory. Enable OneBib under **Settings → Community plugins**.

Please report parsing or formatting edge cases through GitHub Issues.
