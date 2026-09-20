/*https://github.com/JinmuGo/obsidian-theme-by-folder/blob/main/src/ui/FolderSuggest.ts*/

import { App, EventRef, Vault, TFolder, normalizePath, AbstractInputSuggest } from "obsidian";

/**
 * Suggest handler that offers vault folder paths as you type,
 * and invokes a callback when a suggestion is chosen.
 */
export class FolderSuggest extends AbstractInputSuggest<string> {
    private onChoose: (value: string) => void;
    private folderPaths: string[];
    private vaultEvents: EventRef[];

    /**
     * @param inputEl   The <input> element to attach suggestions to
     * @param vault     Obsidian Vault, used to enumerate folders
     * @param app       Obsidian App instance, passed to super
     * @param onChoose  Callback invoked with the chosen folder path
     */
    
    constructor(
        inputEl: HTMLInputElement,
        private vault: Vault,
        app: App,
        onChoose: (value: string) => void,
    ) {
        super(app, inputEl);
        this.onChoose = onChoose;
        this.folderPaths = this.getFolderPaths();

        this.vaultEvents = [
            vault.on('create', () => this.refreshFolderPaths()),
            vault.on('delete', () => this.refreshFolderPaths()),
            vault.on('rename', () => this.refreshFolderPaths()),
        ];
    }

    close(): void {
        this.vaultEvents.forEach(event => this.vault.offref(event));
        super.close();
    }

    /** Return a list of folder paths matching the current input */
    getSuggestions(query: string): string[] {
        const lower = query.toLowerCase();
        return this.folderPaths
            .filter((path) => path.toLowerCase().includes(lower));
    }

    private getFolderPaths(): string[] {
        const folderPaths: string[] = [];
        const collectFolders = (folder: TFolder): void => {
            if (folder.path !== '') {
                folderPaths.push(normalizePath(folder.path));
            }

            folder.children
                .filter((child): child is TFolder => child instanceof TFolder)
                .forEach(collectFolders);
        };

        collectFolders(this.vault.getRoot());
        return folderPaths.sort();
    }

    private refreshFolderPaths(): void {
        this.folderPaths = this.getFolderPaths();
    }

    /** Render each suggestion in the dropdown */
    renderSuggestion(path: string, el: HTMLElement): void {
        el.setText(path);
    }

    /** Handle selection: set input value and invoke callback */
    selectSuggestion(path: string): void {
        this.setValue(path);
        this.onChoose(path);
    }
}