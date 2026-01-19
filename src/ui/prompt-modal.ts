import { App, Modal, TextAreaComponent } from "obsidian";
import { t } from "../utils/i18n";

export class PromptModal extends Modal {
	private promptText: string = "";
	private onSubmit: (prompt: string) => void;

	constructor(app: App, onSubmit: (prompt: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: t("promptModalTitle") });

		const textAreaContainer = contentEl.createDiv();
		textAreaContainer.addClass("maquill-text-area-container");

		const textArea = new TextAreaComponent(textAreaContainer);
		textArea.inputEl.addClass("maquill-text-area");
		textArea.inputEl.placeholder = t("promptModalDefaultValue");
		textArea.onChange((value) => {
			this.promptText = value;
		});

		const buttonContainer = contentEl.createDiv("button-container");
		buttonContainer.addClass("maquill-button-container");

		const submitButton = buttonContainer.createEl("button", {
			text: t("promptModalSubmit"),
		});
		submitButton.addClass("mod-cta");
		submitButton.addEventListener("click", () => {
			const prompt =
				this.promptText.trim() || t("promptModalDefaultValue");
			this.onSubmit(prompt);
			this.close();
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: t("promptModalCancel"),
		});
		cancelButton.addEventListener("click", () => {
			this.close();
		});

		// Handle ESC key
		this.scope.register([], "Escape", () => {
			this.close();
			return false;
		});

		// Handle Ctrl/Cmd+Enter to submit
		this.scope.register(["Mod"], "Enter", () => {
			if (this.promptText.trim()) {
				this.onSubmit(this.promptText.trim());
				this.close();
			}
			return false;
		});

		// Focus text area by default
		textArea.inputEl.focus();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
