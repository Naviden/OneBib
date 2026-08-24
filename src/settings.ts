import {
  App,
  PluginSettingTab,
  Setting,
  requireApiVersion,
  type SettingDefinitionItem,
  type TFile,
} from "obsidian";
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
        name: "Import bibliography file",
        desc: "Choose a .bib file from this device. OneBib copies it into the vault and selects it.",
        aliases: ["BibTeX", "browse", "device"],
        action: () => {
          this.oneBib.openBibliographyImportDialog(() => {
            if (requireApiVersion("1.13.0")) this.update();
          });
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

  /** Fallback for Obsidian versions earlier than 1.13. */
  display(): void {
    this.renderLegacySettings();
  }

  private renderLegacySettings(): void {
    this.containerEl.empty();

    new Setting(this.containerEl)
      .setName("Bibliography file")
      .setDesc("Path to a .bib file inside this vault.")
      .addText((text) =>
        text
          .setPlaceholder("References/library.bib")
          .setValue(this.oneBib.settings.bibliographyPath)
          .onChange(async (value) => {
            this.oneBib.settings.bibliographyPath = value.trim();
            await this.oneBib.saveSettings(false);
          }),
      )
      .addButton((button) =>
        button.setButtonText("Choose").onClick(() => {
          this.oneBib.openBibliographyPicker();
        }),
      )
      .addButton((button) =>
        button.setButtonText("Import").onClick(() => {
          this.oneBib.openBibliographyImportDialog(() => this.renderLegacySettings());
        }),
      );

    new Setting(this.containerEl)
      .setName("Update references automatically")
      .setDesc("Keep the managed references section in cited notes synchronized.")
      .addToggle((toggle) =>
        toggle.setValue(this.oneBib.settings.autoUpdateReferences).onChange(async (value) => {
          this.oneBib.settings.autoUpdateReferences = value;
          await this.oneBib.saveSettings(false);
          if (value) await this.oneBib.reloadBibliography({ notify: false, updateNotes: true });
        }),
      );

    new Setting(this.containerEl)
      .setName("Reference heading")
      .setDesc("Heading used above the generated bibliography.")
      .addText((text) =>
        text.setValue(this.oneBib.settings.referenceHeading).onChange(async (value) => {
          this.oneBib.settings.referenceHeading = value.trim() || "References";
          await this.oneBib.saveSettings(false);
        }),
      );

    new Setting(this.containerEl)
      .setName("Library status")
      .setDesc(this.oneBib.getLibraryStatus())
      .addButton((button) =>
        button.setButtonText("Reload").onClick(async () => {
          await this.oneBib.reloadBibliography({ notify: true, updateNotes: true });
          this.renderLegacySettings();
        }),
      );
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (requireApiVersion("1.13.0")) {
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
  }

  private async reloadAndRefresh(): Promise<void> {
    await this.oneBib.reloadBibliography({ notify: true, updateNotes: true });
    if (requireApiVersion("1.13.0")) this.update();
  }
}
