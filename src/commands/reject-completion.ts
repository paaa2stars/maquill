import { Editor, MarkdownView } from "obsidian";
import type MaquillPlugin from "../main";
import { t } from "../utils/i18n";

export const rejectCompletionCommand = (plugin: MaquillPlugin) => {
	const { inlineCompletionManager } = plugin;

	plugin.addCommand({
		id: "reject-inline-completion",
		name: t("commandRejectInlineCompletion"),
		editorCallback: (_editor: Editor, view: MarkdownView) => {
			const editorView = plugin.getEditorView(view);
			if (editorView && inlineCompletionManager.hasCompletion()) {
				inlineCompletionManager.clearCompletion(editorView);
			}
		},
	});
};
