import { Editor, MarkdownView } from "obsidian";
import type MaquillPlugin from "../main";
import type { LLMService } from "../types";
import * as Generation from "../features/generation";
import { t } from "../utils/i18n";

export const generateCommand = (plugin: MaquillPlugin, service: LLMService) => {
	const { app, settings, inlineCompletionManager } = plugin;

	plugin.addCommand({
		id: "generate-with-prompt",
		name: t("commandGenerateWithPrompt"),
		editorCallback: (editor: Editor, view: MarkdownView) => {
			Generation.generate(
				editor,
				view,
				app,
				settings,
				inlineCompletionManager,
				plugin.getEditorView.bind(plugin),
				service
			);
		},
	});
};
