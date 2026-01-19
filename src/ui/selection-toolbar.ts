import type { App, Editor } from "obsidian";
import { Notice, MarkdownView } from "obsidian";
import type { MaquillSettings } from "../settings";
import { t } from "../utils/i18n";
import { showResult } from "./result-modal";
import * as ToolbarActions from "../toolbar-actions";
import type { GrammarCheckResult, ToolbarAction } from "../toolbar-actions";

export type ToolbarActionConfig = {
	id: ToolbarAction;
	label: string;
	processingMessage: string;
	icon: string;
	execute: (
		text: string,
		app: App,
		settings: MaquillSettings
	) => Promise<string | string[] | GrammarCheckResult>;
};

/**
 * All available toolbar actions
 */
export const TOOLBAR_ACTIONS: Record<ToolbarAction, ToolbarActionConfig> = {
	synonym: {
		id: "synonym",
		label: t("toolbarActionSynonym"),
		processingMessage: t("toolbarProcessingSynonym"),
		icon: "≈",
		execute: (text: string, _app: App, settings: MaquillSettings) =>
			ToolbarActions.getSynonyms(text, settings),
	},
	antonym: {
		id: "antonym",
		label: t("toolbarActionAntonym"),
		processingMessage: t("toolbarProcessingAntonym"),
		icon: "≠",
		execute: (text: string, _app: App, settings: MaquillSettings) =>
			ToolbarActions.getAntonyms(text, settings),
	},
	translate: {
		id: "translate",
		label: t("toolbarActionTranslate"),
		processingMessage: t("toolbarProcessingTranslate"),
		icon: "🌐",
		execute: (text: string, _app: App, settings: MaquillSettings) =>
			ToolbarActions.translate(text, settings),
	},
	explain: {
		id: "explain",
		label: t("toolbarActionExplain"),
		processingMessage: t("toolbarProcessingExplain"),
		icon: "?",
		execute: (text: string, _app: App, settings: MaquillSettings) =>
			ToolbarActions.explain(text, settings),
	},
	grammarCheck: {
		id: "grammarCheck",
		label: t("toolbarActionGrammarCheck"),
		processingMessage: t("toolbarProcessingGrammarCheck"),
		icon: "✓",
		execute: (text: string, _app: App, settings: MaquillSettings) =>
			ToolbarActions.grammarCheck(text, settings),
	},
};

/**
 * Selection toolbar manager
 */
export class SelectionToolbar {
	private app: App;
	private settings: MaquillSettings;
	private toolbar: HTMLElement | null = null;
	private hideTimeout: number | null = null;
	private focusListener: ((e: FocusEvent) => void) | null = null;
	private mutationObserver: MutationObserver | null = null;

	constructor(app: App, settings: MaquillSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Show toolbar at selection
	 */
	show(editor: Editor, view: MarkdownView): void {
		const selectedText = editor.getSelection();
		if (!selectedText || selectedText.trim().length === 0) {
			this.hide();
			return;
		}

		// Clear previous timeout
		if (this.hideTimeout) {
			window.clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}

		// Get selection coordinates
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
		const cm = (view as any).editor?.cm;
		if (!cm) return;

		// Create toolbar if not exists
		if (!this.toolbar) {
			this.createToolbar();
		}

		if (!this.toolbar) return;

		// Position toolbar
		this.positionToolbar(cm);
	}

	/**
	 * Hide toolbar
	 */
	hide(): void {
		if (this.toolbar) {
			this.toolbar.addClass("is-hidden");
		}
	}

	/**
	 * Create toolbar element
	 */
	private createToolbar(): void {
		this.toolbar = document.createElement("div");
		this.toolbar.className = "maquill-selection-toolbar is-hidden";

		// Add buttons based on enabled actions
		const enabledActions = this.settings.toolbarActions
			.map((id) => TOOLBAR_ACTIONS[id])
			.filter(
				(action): action is ToolbarActionConfig => action !== undefined
			);

		for (const action of enabledActions) {
			const button = document.createElement("button");
			button.className = "maquill-toolbar-btn";
			button.setAttribute("data-action", action.id);

			// Icon
			const icon = document.createElement("span");
			icon.className = "maquill-toolbar-icon";
			icon.textContent = action.icon;
			button.appendChild(icon);

			// Label
			const label = document.createElement("span");
			label.className = "maquill-toolbar-label";
			label.textContent = action.label;
			button.appendChild(label);

			button.onclick = () => {
				void this.handleAction(action);
			};

			this.toolbar.appendChild(button);
		}

		document.body.appendChild(this.toolbar);

		// 监听焦点变化，当焦点移到编辑器外部时隐藏工具栏
		this.focusListener = (e: FocusEvent) => {
			const target = e.target as HTMLElement;
			// 如果焦点在工具栏或编辑器内，不处理
			if (
				target.closest(".maquill-selection-toolbar") ||
				target.closest(".cm-editor")
			) {
				return;
			}
			this.hide();
		};
		document.addEventListener("focusin", this.focusListener, true);

		// 监听 DOM 变化，当模态框出现时隐藏工具栏
		this.mutationObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				Array.from(mutation.addedNodes).forEach((node) => {
					if (node instanceof HTMLElement) {
						if (
							node.classList.contains("modal-container") ||
							node.classList.contains("mod-settings") ||
							node.classList.contains("mod-community-plugins") ||
							Array.from(
								node.querySelectorAll(
									".modal-container, .mod-settings, .mod-community-plugins"
								)
							).length > 0
						) {
							this.hide();
							return;
						}
					}
				});
			}
		});
		this.mutationObserver.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	/**
	 * Position toolbar near selection
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private positionToolbar(cm: any): void {
		if (!this.toolbar) return;

		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			const selection = cm.state.selection.main;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			const coords = cm.coordsAtPos(selection.head);

			if (coords) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				this.toolbar.style.left = `${coords.left}px`;
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				this.toolbar.style.top = `${coords.top - 50}px`;
				this.toolbar.removeClass("is-hidden");
			}
		} catch {
			// Fallback positioning
			this.toolbar.removeClass("is-hidden");
		}
	}

	/**
	 * Handle action click
	 */
	private async handleAction(action: ToolbarActionConfig): Promise<void> {
		// Get current selection
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		const editor = activeView.editor;
		const selectedText = editor.getSelection();

		if (!selectedText) {
			new Notice(t("toolbarNoTextSelected"));
			return;
		}

		// Validate API key
		if (!this.settings.apiKey) {
			new Notice(t("toolbarNoApiKey"));
			return;
		}

		this.hide();

		try {
			const notice = new Notice(action.processingMessage, 0);
			const result = await action.execute(
				selectedText,
				this.app,
				this.settings
			);
			notice.hide();

			// Show result
			showResult(
				this.app,
				action.id,
				action.label,
				selectedText,
				result,
				editor
			);
		} catch (error) {
			new Notice(
				`${action.label}${t("toolbarFailed")}: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	}

	/**
	 * Refresh toolbar (rebuild with current settings)
	 */
	refresh(): void {
		if (this.toolbar) {
			this.removeListeners();
			this.toolbar.remove();
			this.toolbar = null;
		}
		// 不需要在这里立刻创建，show() 会在需要时创建
	}

	/**
	 * Cleanup
	 */
	destroy(): void {
		this.removeListeners();
		if (this.toolbar) {
			this.toolbar.remove();
			this.toolbar = null;
		}
		if (this.hideTimeout) {
			window.clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}
	}

	/**
	 * Remove all event listeners
	 */
	private removeListeners(): void {
		if (this.focusListener) {
			document.removeEventListener("focusin", this.focusListener, true);
			this.focusListener = null;
		}
		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
			this.mutationObserver = null;
		}
	}
}
