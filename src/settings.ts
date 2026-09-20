import { App, PluginSettingTab, Setting } from 'obsidian';
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

export class CustomizerSettingTab extends PluginSettingTab {
	plugin: ATCustomizerPlugin;

	constructor(app: App, plugin: ATCustomizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions() {
		return [{
			name: 'Folder mappings',
			render: (setting: Setting) => {
				setting.settingEl.empty();
				this.renderMappings(setting.settingEl, () => this.updateDeclarativeSettings());
			},
		}];
	}

	private updateDeclarativeSettings(): void {
		(this as unknown as { update: () => void }).update();
	}

	display(): void {
		this.containerEl.empty();
		this.renderMappings(this.containerEl, () => this.display());
	}

	private renderMappings(containerEl: HTMLElement, rerender: () => void | Promise<void>): void {
		const { plugin } = this;

		plugin.settings.mappings.forEach(mapping => {
			createMappingEntry(containerEl, mapping, plugin, rerender);
		});

		new Setting(containerEl)
			.setName('Add new mapping')
			.addButton(button => {
				button
					.setButtonText('Add mapping')
					.onClick(async () => {
						const mappings = plugin.settings.mappings;
						let lastIndex = -1;
						let last = 0;

						mappings.forEach(mapping => {
							if (mapping.name.startsWith('Mapping') && mappings.indexOf(mapping) > lastIndex && !isNaN(Number(mapping.name.slice(8)))) {
								lastIndex = mappings.indexOf(mapping);
								last = Number(mapping.name.slice(8));
							}
						});

						const newMapping = { name: `Mapping ${last + 1}`, folder: '', theme: '', accent: '', id: plugin.settings.lastId + 1 };
						plugin.settings.mappings.push(newMapping);
						plugin.settings.lastId++;

						await plugin.saveSettings();
						await rerender();
					});
				});
	}
}
