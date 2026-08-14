import type { ZhipuModel } from "../services";
import type { LanguageOption } from "../utils/language";
import type { ToolbarAction } from "../features/toolbar-actions";

export type ModelProvider = "zhipu" | "lmstudio";

export type UiLanguage = "follow-display" | "zh-CN" | "en";

export type MaquillSettings = {
	uiLanguage: UiLanguage;
	provider: ModelProvider;
	apiKey: string;
	completionModel: ZhipuModel;
	generationModel: ZhipuModel;
	toolbarActions: ToolbarAction[];
	enableSelectionToolbar: boolean;
	responseLanguage: LanguageOption;
	translationTargetLanguage: LanguageOption;
	generationSavePath: string;
	lmstudioBaseUrl: string;
	lmstudioModel: string;
};

export const DEFAULT_SETTINGS: MaquillSettings = {
	uiLanguage: "follow-display",
	provider: "lmstudio",
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
	generationSavePath: "generations",
	lmstudioBaseUrl: "http://localhost:1234",
	lmstudioModel: "",
};
