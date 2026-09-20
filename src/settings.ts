import { App, ButtonComponent, PluginSettingTab, Setting } from 'obsidian';
import ATCustomizerPlugin from './main';
import { createMappingEntry } from './UI/settingsElements';

export interface folderCustomizationMapping {
	name: string;
	id: number;
	folder: string;
	theme: string;
	accent: string;
}

export interface customizerSettings {
	mappings: folderCustomizationMapping[];
	lastId: number;
	debug: boolean;
}

export const DEFAULT_SETTINGS: customizerSettings = {
	mappings: [],
	lastId: 0,
	debug: false
};

export class SampleSettingTab extends PluginSettingTab {
	plugin: ATCustomizerPlugin;

	constructor(app: App, plugin: ATCustomizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		var plugin = this.plugin;

		renderSettings();

		function renderSettings(editingId: number = -1): void {
			containerEl.empty();

			plugin.settings.mappings.forEach(mapping => {
				createMappingEntry(containerEl, mapping, plugin, renderSettings, editingId);
			})
			
			new Setting(containerEl)
				.setName("Add new mapping").addButton(b => {
					b
						.setButtonText("Add mapping")
						.onClick(async () => {
							var mappings = plugin.settings.mappings;
							var lastIndex = -1;
							var last = 0;

							mappings.forEach(mapping => {
								if (mapping.name.startsWith("Mapping") && mappings.indexOf(mapping) > lastIndex && !isNaN(Number(mapping.name.slice(8)))) {
									lastIndex = mappings.indexOf(mapping);
									last = Number(mapping.name.slice(8));
								}
							})

							var newMapping = { name: `Mapping ${last + 1}`, folder: ``, theme: ``, accent: ``, id: plugin.settings.lastId + 1 };
							plugin.settings.mappings.push(newMapping);
							plugin.settings.lastId++;

							await plugin.saveSettings();

							renderSettings();
						});
				});
		}
	}
}
