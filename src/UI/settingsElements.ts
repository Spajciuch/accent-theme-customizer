import { Setting } from 'obsidian';
import { folderCustomizationMapping } from '../settings';
import ATCustomizerPlugin from '../main';
import { FolderSuggest } from '../utils/folderSuggest';
import { getAvailableThemes } from '../utils/themesUtils';

export function createMappingEntry(containerEl: HTMLElement, mapping: folderCustomizationMapping, plugin: ATCustomizerPlugin, renderSettings: (id?: number) => void | Promise<void>, editingId = -1) {
    const setting = new Setting(containerEl);

    if (editingId === mapping.id) {	// Displayed when user wants to edit mapping's name
        setting
            .addText(text => {	// Display old name
                const input = text.setValue(mapping.name).onChange(newText => {
                    mapping.name = newText;
                });
                window.setTimeout(() => input.inputEl.focus(), 50);
                input.inputEl.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        void plugin.saveSettings();
                        void renderSettings();
                    } else if (e.key === "Escape") {
                        void renderSettings();
                    }
                });
                return input;
            })
            .addButton(b => {	// Confirm 
                b.setIcon('checkmark').onClick(async () => {
                    await plugin.saveSettings();
                        void renderSettings();
                })
            })
    } else {	// Normal display
        setting
            .setName(mapping.name)
            .addButton(b => {
                b.setIcon('pencil').setTooltip("Edit name").onClick(() => {
                    void renderSettings(mapping.id);
                })
            })
    }

    setting
        // Specify folder path
        .addText(text => {
            const input = text
                .setPlaceholder("Folder path")
                .setValue(mapping.folder)
                .onChange(async newPath => {
                    mapping.folder = newPath;
                    await plugin.saveSettings();
                });

            new FolderSuggest(input.inputEl, plugin.app.vault, plugin.app, (value: string) => {
                mapping.folder = value;
                void plugin.saveSettings();

                void renderSettings();
            });

            return input;
        })
        // Dropdown menu for choosing from available themes
        .addDropdown(menu => {
            menu.addOption("", "Do nothing");
            getAvailableThemes(plugin.app).forEach((t) => void menu.addOption(t, t));

            if (mapping.theme === "") {
                menu.setValue("");
            } else {
                menu.setValue(mapping.theme);
            }

            menu.onChange(async () => {
                mapping.theme = menu.getValue();
                await plugin.saveSettings();
            })
        })
        // Color picker to change accent value
        .addColorPicker(picker => {
            if (mapping.accent !== "") {
                picker.setValue(mapping.accent);
            }
            else {
                picker.setDisabled(true);
            }
            picker.onChange(async value => {
                mapping.accent = value;
                await plugin.saveSettings();
            })
        })
        .addToggle(colorToggle => {
            if (mapping.accent === "") {
                colorToggle.setValue(false);
                colorToggle.setTooltip("Enable custom accent color");
            } else {
                colorToggle.setValue(true);
                colorToggle.setTooltip("Disable custom accent color");
            }

            colorToggle.onChange(async val => {
                if (!val) {
                    mapping.accent = "";
                } else {
                    mapping.accent = "#8a5cf5";
                }

                await plugin.saveSettings();
            void renderSettings();
            })
        })
        // Button to remove mapping
        .addButton(b => {
            b.setIcon('trash').onClick(async () => {
                const mappings = plugin.settings.mappings;
                mappings.splice(mappings.indexOf(mapping), 1);

                void renderSettings();
            });
        })
}