import { App, PluginSettingTab, type SettingDefinitionItem, type TFile } from "obsidian";
import type OneBibPlugin from "./main";

export class OneBibSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly oneBib: OneBibPlugin,
  ) {
    super(app, oneBib);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: "Bibliography file",
        desc: "Choose a .bib file inside this vault.",
        aliases: ["BibTeX", "library"],
        control: {
          type: "file",
          key: "bibliographyPath",
          placeholder: "References/library.bib",
          filter: (file: TFile) => file.extension.toLowerCase() === "bib",
          validate: (value: string) =>
            !value || value.toLowerCase().endsWith(".bib") ? undefined : "Choose a file with the .bib extension.",
        },
      },
      {
        name: "Update references automatically",
        desc: "Keep the managed references section in cited notes synchronized.",
        control: {
          type: "toggle",
          key: "autoUpdateReferences",
          defaultValue: true,
        },
      },
      {
        name: "Reference heading",
        desc: "Heading used above the generated bibliography.",
        control: {
          type: "text",
          key: "referenceHeading",
          defaultValue: "References",
          placeholder: "References",
          validate: (value: string) => (value.trim() ? undefined : "Enter a heading."),
        },
      },
      {
        name: "Reload bibliography",
        desc: this.oneBib.getLibraryStatus(),
        action: () => {
          void this.reloadAndRefresh();
        },
      },
    ];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const normalized = typeof value === "string" ? value.trim() : value;
    await super.setControlValue(key, normalized);

    if (key === "bibliographyPath") {
      await this.oneBib.reloadBibliography({ notify: false, updateNotes: true });
      this.update();
    } else if (key === "autoUpdateReferences" && normalized === true) {
      await this.oneBib.reloadBibliography({ notify: false, updateNotes: true });
    } else if (key === "referenceHeading" && this.oneBib.settings.autoUpdateReferences) {
      await this.oneBib.reloadBibliography({ notify: false, updateNotes: true });
    }
  }

  private async reloadAndRefresh(): Promise<void> {
    await this.oneBib.reloadBibliography({ notify: true, updateNotes: true });
    this.update();
  }
}
