<p align="center">
  <img src="logo.png" alt="OneBib logo" width="320">
</p>

# OneBib

OneBib adds simple, local BibTeX citations and reference lists to Obsidian notes. It does not require Zotero, Mendeley, an account, or a network connection.

## Use OneBib

1. Open **Settings → OneBib** and select **Import bibliography file** to choose a `.bib` file directly from your device. OneBib copies it into the root of the vault and selects it. Alternatively, put a `.bib` file anywhere inside the vault and select it in the **Bibliography file** setting. If the vault contains exactly one `.bib` file, OneBib selects it automatically.
2. Type a citation key between `>>` and `<<`:

   ```markdown
   Explanations are important for trustworthy systems >>cambria2023survey<<.
   ```

3. In Live Preview and Reading view, OneBib renders the marker as `(Cambria et al., 2023)`.
4. OneBib adds a managed **References** section to the end of the note and keeps it synchronized.

Type `>>` to search the library by citation key, author, or title. You can also use the **Insert citation** command. Multiple works can be cited together with `>>firstKey; secondKey<<`.

OneBib automatically adds a safety space after a closing `<<` when the next character is not whitespace or punctuation. This keeps adjoining words from being interpreted as HTML-like markup in Live Preview.

The original marker stays in the Markdown file. Move the cursor onto a rendered citation in Live Preview to edit its key.

### Reference markers while editing

OneBib surrounds the generated References section with two internal markers:

```markdown
<!-- onebib:references:start -->
<!-- onebib:references:end -->
```

Obsidian may show these lines in Live Preview or Source mode. This is normal: OneBib uses them to find and safely update the generated bibliography. Switch to **Reading view** with the book icon for a clean document; the markers are hidden there. Do not edit or delete the markers. Edit the `.bib` file or citation keys instead.

## Example BibTeX

```bibtex
@article{cambria2023survey,
  title = {A survey on XAI and natural language explanations},
  author = {Cambria, Erik and Malandri, Lorenzo and Mercorio, Fabio and Mezzanzanica, Mario and Nobani, Navid},
  journal = {Information Processing \& Management},
  volume = {60},
  number = {1},
  pages = {103111},
  year = {2023},
  publisher = {Elsevier}
}
```

## Commands

- **Insert citation** opens a searchable citation picker.
- **Update references in current note** refreshes the managed bibliography immediately.
- **Choose BibTeX file** selects a `.bib` file from the vault.
- **Import bibliography file from device** opens the system file picker, copies the selected `.bib` into the vault, and loads it.
- **Reload bibliography** reparses the selected file.

## Install for development

Use a separate test vault while developing plugins.

```bash
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/onebib/`, then enable OneBib under **Settings → Community plugins**.

## Privacy and compatibility

OneBib reads only the selected `.bib` file and Markdown notes in the current vault. If you use **Import bibliography file**, the system file picker grants access only to the file you explicitly select, and OneBib immediately copies it into the vault. It has no network access, account requirement, advertising, payments, or telemetry. The runtime bundle has no bundled third-party dependencies and supports both desktop and mobile Obsidian 1.5.0 and later. On Obsidian 1.13.0 and later, its settings are also available through settings search.

## Current scope

The built-in formatter provides a practical APA-like author–year style. It is not yet a complete CSL or BibTeX implementation. The parser supports common BibTeX entries, nested braces, quoted values, string macros, and concatenated values.

The content inside the managed References block is generated. Edit the BibTeX source or citation markers instead of editing that block manually.

## Release

OneBib follows the [official Obsidian plugin release process](https://docs.obsidian.md/plugins/releasing/submit-plugin):

1. Set the same semantic version in `manifest.json` and `package.json`.
2. Update `versions.json` only when the minimum Obsidian version changes.
3. Commit and push the release.
4. Tag it with the exact version number, such as `1.0.2`.
5. The release workflow builds and attaches `main.js`, `manifest.json`, `styles.css`, and an installation ZIP to the GitHub release.

## License

[MIT](LICENSE)
