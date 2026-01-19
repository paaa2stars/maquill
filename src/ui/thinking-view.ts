import { ItemView, WorkspaceLeaf, MarkdownRenderer } from "obsidian";
import { t } from "../utils/i18n";

export const THINKING_VIEW_TYPE = "maquill-thinking-view";

export class ThinkingView extends ItemView {
	private thinkingContentEl: HTMLElement;
	private thinkingContent: string = "";
	private stopButton: HTMLButtonElement;
	private onStopCallback: (() => void) | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return THINKING_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Maquill thinking";
	}

	getIcon(): string {
		return "brain-circuit";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		if (!container) return;

		container.empty();
		container.addClass("maquill-thinking-view");

		// Header with title and stop button
		const header = container.createEl("div");
		header.addClass("maquill-thinking-header");

		header.createEl("h4", { text: t("thinkingViewTitle") });

		this.stopButton = header.createEl("button", {
			text: t("thinkingViewStop"),
		});
		this.stopButton.addClass("maquill-stop-btn");
		this.stopButton.addEventListener("click", () => {
			if (this.onStopCallback) {
				this.onStopCallback();
			}
		});

		// Content area
		this.thinkingContentEl = container.createEl("div");
		this.thinkingContentEl.addClass("maquill-thinking-content");
	}

	async onClose() {
		// Cleanup
		this.onStopCallback = null;
	}

	/**
	 * Update thinking content
	 */
	updateThinking(content: string) {
		this.thinkingContent = content;
		this.thinkingContentEl.empty();

		if (content) {
			// Render markdown content
			void MarkdownRenderer.render(
				this.app,
				content,
				this.thinkingContentEl,
				"",
				this
			);
		} else {
			const p = this.thinkingContentEl.createEl("p", {
				text: t("thinkingViewWaiting"),
			});
			p.addClass("maquill-thinking-placeholder");
		}

		// Auto scroll to bottom
		this.thinkingContentEl.scrollTop = this.thinkingContentEl.scrollHeight;
	}

	/**
	 * Clear thinking content
	 */
	clearThinking() {
		this.thinkingContent = "";
		this.updateThinking("");
	}

	/**
	 * Append to thinking content
	 */
	appendThinking(chunk: string) {
		this.thinkingContent += chunk;
		this.updateThinking(this.thinkingContent);
	}

	/**
	 * Set the stop callback and show/hide the button
	 */
	setStopCallback(callback: (() => void) | null) {
		this.onStopCallback = callback;
		if (callback) {
			this.stopButton.addClass("is-visible");
		} else {
			this.stopButton.removeClass("is-visible");
		}
	}

	/**
	 * Append stopped message
	 */
	appendStoppedMessage() {
		this.thinkingContent += `\n\n*${t("thinkingViewStopped")}*`;
		this.updateThinking(this.thinkingContent);
	}
}
