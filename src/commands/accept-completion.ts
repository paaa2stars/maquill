import { Editor, MarkdownView } from "obsidian";
import type MaquillPlugin from "../main";
import { t } from "../utils/i18n";

export const acceptCompletionCommand = (plugin: MaquillPlugin) => {
	const { inlineCompletionManager } = plugin;

	plugin.addCommand({
		id: "accept-inline-completion",
		name: t("commandAcceptInlineCompletion"),
		editorCallback: (_editor: Editor, view: MarkdownView) => {
			const editorView = plugin.getEditorView(view);
			if (editorView && inlineCompletionManager.hasCompletion()) {
				inlineCompletionManager.acceptCompletion(editorView);
			}
		},
	});
};
