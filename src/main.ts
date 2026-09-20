import {
	Modal,
	Notice,
	Plugin,
	TFile,
	WorkspaceLeaf,
	FileView,
	normalizePath,
	TFolder,
	ButtonComponent,
	App
} from 'obsidian';

import {
	DEFAULT_SETTINGS,
	customizerSettings,
	folderCustomizationMapping,
	CustomizerSettingTab,
} from './settings';

declare module "obsidian" {
	interface App {
		customCss: {
			setTheme(theme: string): void;
			theme: string;
			themes: Record<string, unknown>;
		};
	}
}

import { createMappingEntry } from './UI/settingsElements';

export default class ATCustomizerPlugin extends Plugin {
	private lastProcessedPath = "";
	settings!: customizerSettings;

	async onload() {


		await this.loadSettings();

		this.registerEvent(this.app.workspace.on("file-open", (file) => this.handleFileOpen(file)));
		this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => this.handleActiveLeadChange(leaf)));

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFolder) {
					menu.addItem((item) => {
						item
							.setTitle('Apply custom theme / accent')
							.setIcon('brush')
							.onClick(() => {
								new ATCustomizerModal(this.app, this, file.path, mapping => { this.applyCustomization(mapping) }).open();
							});
					});
				}
			})
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new CustomizerSettingTab(this.app, this));
	}

	onunload() { }

	async handleFileOpen(file: TFile | null) {
		if (!file) {
			this.lastProcessedPath = "";
			return;
		}

		const path = normalizePath(file.path);
		if (path == this.lastProcessedPath) return;

		this.lastProcessedPath = path;

		const mapping = this.pickMappingForPath(path);
		this.applyCustomization(mapping);
	}

	applyCustomization(mapping: folderCustomizationMapping): void {
		try {
			if (mapping.accent !== "") {
				const color = this.hexToHSL(mapping.accent);

				document.body.style.setProperty("--accent-h", color.h);
				document.body.style.setProperty("--accent-s", `${color.s}%`);
				document.body.style.setProperty("--accent-l", `${color.l}%`);
			}

			if (mapping.theme !== "") {
				this.app.customCss.setTheme(mapping.theme);
			}

		} catch {
			new Notice("An error occured while applying theme and/or accent color");
		}
	}

	private pickMappingForPath(path: string): folderCustomizationMapping {
		const match = this.settings.mappings
			.filter((m) => path.startsWith(normalizePath(m.folder) + "/"))
			.sort((a, b) => b.folder.length - a.folder.length)[0];

		if (match) {
			return match
		}

		return { name: ``, folder: ``, theme: ``, accent: ``, id: -1 };
	}

	handleActiveLeadChange(leaf: WorkspaceLeaf | null): void {
		void this.handleFileOpen(this.getFileForLeaf(leaf));
	}

	private getFileForLeaf(leaf: WorkspaceLeaf | null): TFile | null {
		if (!leaf) return null;

		if (leaf.view instanceof FileView) {
			return leaf.view.file;
		}

		const state = leaf.getViewState().state;
		const filePath = typeof state?.file === "string" ? state.file : state?.filePath;
		return typeof filePath === "string" ? this.app.vault.getFileByPath(filePath) : null;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<customizerSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	hexToHSL(H: string): { h: string; s: string; l: string } {
		// Convert hex to RGB first
		let r = 0, g = 0, b = 0;
		if (H.length == 4) {
			r = Number.parseInt(H.slice(1, 2).repeat(2), 16);
			g = Number.parseInt(H.slice(2, 3).repeat(2), 16);
			b = Number.parseInt(H.slice(3, 4).repeat(2), 16);
		} else if (H.length == 7) {
			r = Number.parseInt(H.slice(1, 3), 16);
			g = Number.parseInt(H.slice(3, 5), 16);
			b = Number.parseInt(H.slice(5, 7), 16);
		}
		// Then to HSL
		r /= 255;
		g /= 255;
		b /= 255;
		let cmin = Math.min(r, g, b),
			cmax = Math.max(r, g, b),
			delta = cmax - cmin,
			h = 0,
			s = 0,
			l = 0;

		if (delta == 0)
			h = 0;
		else if (cmax == r)
			h = ((g - b) / delta) % 6;
		else if (cmax == g)
			h = (b - r) / delta + 2;
		else
			h = (r - g) / delta + 4;

		h = Math.round(h * 60);

		if (h < 0)
			h += 360;

		l = (cmax + cmin) / 2;
		s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
		s = +(s * 100).toFixed(1);
		l = +(l * 100).toFixed(1);

		h = Math.round(h);
		s = Math.round(s);
		l = Math.round(l);

		const obj = {
			h: h.toString(),
			s: s.toString(),
			l: l.toString()
		};

		return obj;
	}

}

async function findOrCreateMapping(plugin: ATCustomizerPlugin, path: string) {
	const mappings = plugin.settings.mappings;

	const result = mappings.find(e => e.folder == path);

	if (result !== undefined) {
		return result;
	}

	let lastIndex = -1;
	let last = 0;

	mappings.forEach(mapping => {
		if (mapping.name.startsWith("Mapping") && mappings.indexOf(mapping) > lastIndex && !isNaN(Number(mapping.name.slice(8)))) {
			lastIndex = mappings.indexOf(mapping);
			last = Number(mapping.name.slice(8));
		}
	})

	const newMapping = { name: `Mapping ${last + 1}`, folder: path, theme: ``, accent: ``, id: plugin.settings.lastId + 1 };
	plugin.settings.mappings.push(newMapping);
	plugin.settings.lastId++;

	await plugin.saveSettings();

	return newMapping;
}

export class ATCustomizerModal extends Modal {
    private plugin: ATCustomizerPlugin;
    private path: string;
    private onSubmit: (result: folderCustomizationMapping) => void;

    constructor(app: App, plugin: ATCustomizerPlugin, path: string, onSubmit: (result: folderCustomizationMapping) => void) {
        super(app);
        this.plugin = plugin;
        this.path = path;
        this.onSubmit = onSubmit;

        this.setTitle('Customize this folder!');
    }

    async onOpen() {
        const renderSettings = async (id: number = -1): Promise<void> => {
            this.contentEl.empty();

            const mapping = await findOrCreateMapping(this.plugin, this.path);
            createMappingEntry(this.contentEl, mapping, this.plugin, renderSettings, id);

            new ButtonComponent(this.contentEl)
                .setButtonText('Submit')
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit(mapping);
                });
        };

        await renderSettings();
    }
}