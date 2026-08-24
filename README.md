# OneBib

OneBib adds simple, local BibTeX citations and reference lists to Obsidian notes. It does not require Zotero, Mendeley, an account, or a network connection.

## Use OneBib

1. Put a `.bib` file anywhere inside your vault.
2. Open **Settings → OneBib** and choose that file. If the vault contains exactly one `.bib` file, OneBib selects it automatically.
3. Type a citation key between `>>` and `<<`:

   ```markdown
   Explanations are important for trustworthy systems >>cambria2023survey<<.
   ```

4. In Live Preview and Reading view, OneBib renders the marker as `(Cambria et al., 2023)`.
5. OneBib adds a managed **References** section to the end of the note and keeps it synchronized.

Type `>>` to search the library by citation key, author, or title. You can also use the **Insert citation** command. Multiple works can be cited together with `>>firstKey; secondKey<<`.

The original marker stays in the Markdown file. Move the cursor onto a rendered citation in Live Preview to edit its key.

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
- **Reload bibliography** reparses the selected file.

## Install for development

Use a separate test vault while developing plugins.

```bash
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/onebib/`, then enable OneBib under **Settings → Community plugins**.

## Privacy and compatibility

OneBib reads only the selected `.bib` file and Markdown notes in the current vault. It has no network access, account requirement, advertising, payments, or telemetry. It does not access files outside the vault. The runtime bundle has no bundled third-party dependencies and supports both desktop and mobile Obsidian 1.13.0 and later.

## Current scope

The built-in formatter provides a practical APA-like author–year style. It is not yet a complete CSL or BibTeX implementation. The parser supports common BibTeX entries, nested braces, quoted values, string macros, and concatenated values.

The block between `<!-- onebib:references:start -->` and `<!-- onebib:references:end -->` is generated. Edit the BibTeX source or citation markers instead of editing that block manually.

## Release

OneBib follows the [official Obsidian plugin release process](https://docs.obsidian.md/plugins/releasing/submit-plugin):

1. Set the same semantic version in `manifest.json` and `package.json`.
2. Update `versions.json` only when the minimum Obsidian version changes.
3. Commit and push the release.
4. Tag it with the exact version number, such as `1.0.0`.
5. The release workflow builds and attaches `main.js`, `manifest.json`, `styles.css`, and an installation ZIP to the GitHub release.

## License

[MIT](LICENSE)
