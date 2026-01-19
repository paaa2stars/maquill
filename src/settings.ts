import { App, PluginSettingTab, Setting } from "obsidian";
import type MaquillPlugin from "./main";
import { ZHIPU_MODEL_LIST, type ZhipuModel } from "./zhipu-service";
import { TOOLBAR_ACTIONS } from "./ui/selection-toolbar";
import { t } from "./utils/i18n";
import {
	LANGUAGE_CODE_TO_NATIVE_NAME,
	type LanguageOption,
} from "./utils/language";
import { FolderSuggest } from "./ui/path-suggest";
import type { ToolbarAction } from "./toolbar-actions";

export type MaquillSettings = {
	apiKey: string;
	completionModel: ZhipuModel;
	generationModel: ZhipuModel;
	toolbarActions: ToolbarAction[];
	enableSelectionToolbar: boolean;
	responseLanguage: LanguageOption;
	translationTargetLanguage: LanguageOption;
	generationSavePath: string;
};

export const DEFAULT_SETTINGS: MaquillSettings = {
	apiKey: "",
	completionModel: "glm-4.7",
	generationModel: "glm-4.7",
	toolbarActions: [
		"synonym",
		"antonym",
		"translate",
		"explain",
		"grammarCheck",
	],
	enableSelectionToolbar: true,
	responseLanguage: "follow-display",
	translationTargetLanguage: "follow-display",
	generationSavePath: "generation_history",
};

export class MaquillSettingTab extends PluginSettingTab {
	plugin: MaquillPlugin;

	constructor(app: App, plugin: MaquillPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName(t("settingsLanguageModelConfig"))
			.setHeading();

		// API Key
		new Setting(containerEl)
			.setName(t("settingsApiKey"))
			.setDesc(t("settingsApiKeyDesc"))
			.addText((text) => {
				text.inputEl.type = "password";
				text.setPlaceholder(t("settingsApiKeyPlaceholder"))
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					});
			});

		// Completion model
		new Setting(containerEl)
			.setName(t("settingsCompletionModel"))
			.setDesc(t("settingsCompletionModelDesc"))
			.addDropdown((dropdown) => {
				for (const model of ZHIPU_MODEL_LIST) {
					dropdown.addOption(model, model);
				}
				dropdown
					.setValue(this.plugin.settings.completionModel)
					.onChange(async (value) => {
						this.plugin.settings.completionModel =
							value as ZhipuModel;
						await this.plugin.saveSettings();
					});
			});

		// Generation model
		new Setting(containerEl)
			.setName(t("settingsGenerationModel"))
			.setDesc(t("settingsGenerationModelDesc"))
			.addDropdown((dropdown) => {
				for (const model of ZHIPU_MODEL_LIST) {
					dropdown.addOption(model, model);
				}
				dropdown
					.setValue(this.plugin.settings.generationModel)
					.onChange(async (value) => {
						this.plugin.settings.generationModel =
							value as ZhipuModel;
						await this.plugin.saveSettings();
					});
			});

		// Response language
		new Setting(containerEl)
			.setName(t("settingsResponseLanguage"))
			.setDesc(t("settingsResponseLanguageDesc"))
			.addDropdown((dropdown) => {
				// Add "Follow display language" option
				dropdown.addOption(
					"follow-display",
					t("settingsLanguageFollowDisplay")
				);

				// Add all supported languages with native names
				for (const [code, nativeName] of Object.entries(
					LANGUAGE_CODE_TO_NATIVE_NAME
				)) {
					dropdown.addOption(code, nativeName);
				}

				dropdown
					.setValue(this.plugin.settings.responseLanguage)
					.onChange(async (value) => {
						this.plugin.settings.responseLanguage =
							value as LanguageOption;
						await this.plugin.saveSettings();
					});
			});

		// Generation config section
		new Setting(containerEl)
			.setName(t("settingsGenerationConfig"))
			.setHeading();

		// Generation save path
		new Setting(containerEl)
			.setName(t("settingsGenerationSavePath"))
			.setDesc(t("settingsGenerationSavePathDesc"))
			.addText((text) => {
				text.setPlaceholder(t("settingsGenerationSavePathPlaceholder"))
					.setValue(this.plugin.settings.generationSavePath)
					.onChange(async (value) => {
						this.plugin.settings.generationSavePath = value;
						await this.plugin.saveSettings();
					});
				// Add folder suggester
				new FolderSuggest(this.app, text.inputEl);
			});

		// Selection toolbar section
		new Setting(containerEl)
			.setName(t("settingsSelectionToolbar"))
			.setHeading();

		// Enable selection toolbar
		new Setting(containerEl)
			.setName(t("settingsEnableSelectionToolbar"))
			.setDesc(t("settingsEnableSelectionToolbarDesc"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enableSelectionToolbar)
					.onChange(async (value) => {
						this.plugin.settings.enableSelectionToolbar = value;
						await this.plugin.saveSettings();
					});
			});

		// Translation target language
		new Setting(containerEl)
			.setName(t("settingsTranslationTargetLanguage"))
			.setDesc(t("settingsTranslationTargetLanguageDesc"))
			.addDropdown((dropdown) => {
				// Add "Follow display language" option
				dropdown.addOption(
					"follow-display",
					t("settingsLanguageFollowDisplay")
				);

				// Add all supported languages with native names
				for (const [code, nativeName] of Object.entries(
					LANGUAGE_CODE_TO_NATIVE_NAME
				)) {
					dropdown.addOption(code, nativeName);
				}

				dropdown
					.setValue(this.plugin.settings.translationTargetLanguage)
					.onChange(async (value) => {
						this.plugin.settings.translationTargetLanguage =
							value as LanguageOption;
						await this.plugin.saveSettings();
					});
			});

		// Add draggable toolbar actions
		this.renderToolbarActions(containerEl);
	}

	private renderToolbarActions(containerEl: HTMLElement): void {
		// 确保所有工具都在列表中（启用的在前，禁用的在后）
		const allActionIds = Object.keys(TOOLBAR_ACTIONS) as ToolbarAction[];
		const enabledActions = this.plugin.settings.toolbarActions.filter(
			(id) => allActionIds.includes(id)
		);
		const disabledActions = allActionIds.filter(
			(id) => !enabledActions.includes(id)
		);
		const orderedActions = [...enabledActions, ...disabledActions];

		const actionContainer = containerEl.createDiv(
			"maquill-toolbar-actions"
		);

		let draggedEl: HTMLElement | null = null;

		for (const actionId of orderedActions) {
			const action = TOOLBAR_ACTIONS[actionId];
			const isEnabled =
				this.plugin.settings.toolbarActions.includes(actionId);

			const itemEl = actionContainer.createDiv(
				"maquill-toolbar-action-item"
			);
			itemEl.setAttribute("draggable", "true");
			itemEl.dataset.actionId = actionId;

			// 拖动手柄
			const handleEl = itemEl.createSpan("maquill-drag-handle");
			handleEl.textContent = "⋮⋮";

			// 工具名称
			const labelEl = itemEl.createSpan("maquill-action-label");
			labelEl.textContent = `${action.icon} ${action.label}`;

			// 启用开关
			new Setting(itemEl)
				.setClass("maquill-action-toggle")
				.addToggle((toggle) => {
					toggle.setValue(isEnabled).onChange(async (value) => {
						if (value) {
							if (
								!this.plugin.settings.toolbarActions.includes(
									actionId
								)
							) {
								this.plugin.settings.toolbarActions.push(
									actionId
								);
							}
						} else {
							this.plugin.settings.toolbarActions =
								this.plugin.settings.toolbarActions.filter(
									(id) => id !== actionId
								);
						}
						await this.plugin.saveSettings();
					});
				});

			// 拖动事件
			itemEl.addEventListener("dragstart", (e) => {
				draggedEl = itemEl;
				e.dataTransfer?.setData("text/plain", actionId);
				e.dataTransfer!.effectAllowed = "move";
				// 延迟添加样式，避免拖动预览也变透明
				requestAnimationFrame(() => {
					itemEl.addClass("dragging");
				});
			});

			itemEl.addEventListener("dragend", () => {
				itemEl.removeClass("dragging");
				draggedEl = null;
				// 移除所有 drag-over 样式
				actionContainer
					.querySelectorAll(".drag-over")
					.forEach((el) => el.removeClass("drag-over"));
			});

			itemEl.addEventListener("dragover", (e) => {
				e.preventDefault();
				e.dataTransfer!.dropEffect = "move";

				if (!draggedEl || draggedEl === itemEl) return;

				// 获取鼠标在目标元素中的位置
				const rect = itemEl.getBoundingClientRect();
				const midY = rect.top + rect.height / 2;

				// 移除其他元素的 drag-over 样式
				actionContainer
					.querySelectorAll(".drag-over")
					.forEach((el) => el.removeClass("drag-over"));

				// 实时移动元素
				if (e.clientY < midY) {
					// 插入到目标元素之前
					if (itemEl.previousElementSibling !== draggedEl) {
						actionContainer.insertBefore(draggedEl, itemEl);
					}
				} else {
					// 插入到目标元素之后
					if (itemEl.nextElementSibling !== draggedEl) {
						actionContainer.insertBefore(
							draggedEl,
							itemEl.nextElementSibling
						);
					}
				}
			});

			itemEl.addEventListener("drop", (e) => {
				e.preventDefault();

				if (!draggedEl) return;

				// 根据当前 DOM 顺序重建启用列表
				const newOrder: ToolbarAction[] = [];
				actionContainer
					.querySelectorAll(".maquill-toolbar-action-item")
					.forEach((el) => {
						const id = (el as HTMLElement).dataset
							.actionId as ToolbarAction;
						// 保持原有的启用状态
						if (this.plugin.settings.toolbarActions.includes(id)) {
							newOrder.push(id);
						}
					});

				this.plugin.settings.toolbarActions = newOrder;
				void this.plugin.saveSettings();
			});
		}
	}
}
