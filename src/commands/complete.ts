import { Editor, MarkdownView } from "obsidian";
import type MaquillPlugin from "../main";
import * as Completion from "../completion";
import { t } from "../utils/i18n";

export const completeCommand = (plugin: MaquillPlugin) => {
	const { app, settings, inlineCompletionManager } = plugin;

	plugin.addCommand({
		id: "complete-word-sentence",
		name: t("commandCompleteWordSentence"),
		editorCallback: async (editor: Editor, view: MarkdownView) => {
			await Completion.complete(
				editor,
				view,
				app,
				settings,
				inlineCompletionManager,
				plugin.getEditorView.bind(plugin)
			);
		},
	});
};
