import {
	AbstractInputSuggest,
	App,
	TAbstractFile,
	TFile,
	TFolder,
} from "obsidian";

/**
 * Folder path suggester for settings input
 */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(app: App, textInputEl: HTMLInputElement) {
		super(app, textInputEl);
	}

	getSuggestions(query: string): TFolder[] {
		const folders: TFolder[] = [];
		const lowerCaseQuery = query.toLowerCase();

		// Get all folders in vault
		this.app.vault.getAllLoadedFiles().forEach((file: TAbstractFile) => {
			if (file instanceof TFolder) {
				if (file.path.toLowerCase().includes(lowerCaseQuery)) {
					folders.push(file);
				}
			}
		});

		return folders;
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}

	selectSuggestion(folder: TFolder): void {
		this.setValue(folder.path);
		this.close();
	}
}

/**
 * File path suggester for settings input
 * Can filter by file extension
 */
export class FileSuggest extends AbstractInputSuggest<TFile> {
	private extension: string;

	constructor(app: App, textInputEl: HTMLInputElement, extension = ".md") {
		super(app, textInputEl);
		this.extension = extension;
	}

	getSuggestions(query: string): TFile[] {
		const files: TFile[] = [];
		const lowerCaseQuery = query.toLowerCase();

		// Get all files in vault
		this.app.vault.getAllLoadedFiles().forEach((file: TAbstractFile) => {
			if (
				file instanceof TFile &&
				file.extension === this.extension.replace(".", "")
			) {
				if (file.path.toLowerCase().includes(lowerCaseQuery)) {
					files.push(file);
				}
			}
		});

		return files;
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	selectSuggestion(file: TFile): void {
		this.setValue(file.path);
		this.close();
	}
}
