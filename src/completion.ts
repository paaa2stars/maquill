import type { Editor, MarkdownView, App } from "obsidian";
import { Notice } from "obsidian";
import type { EditorView } from "@codemirror/view";
import type { MaquillSettings } from "./settings";
import { callZhipuCompletion } from "./zhipu-service";
import { InlineCompletionManager } from "./ui/candidate-text";
import { t } from "./utils/i18n";

/**
 * System prompt for word/sentence completion
 */
const SYSTEM_PROMPT = `
你是一个写作补全助手。你的唯一任务是在插入位置补全最小必要内容（一个词或一句话），使前后文本在语义和语法上自然连贯。

要求：
- 不重复前文或后文中的任何片段
- 不添加解释、引号或格式
- 优先选择最短可行补全
- 补全内容的语言必须与紧挨着的前后文保持一致，根据上下文语境判断应使用的语言`;

/**
 * Build user prompt for completion with context
 */
function buildCompletionUserPrompt(prefix: string, postfix: string): string {
	return `
【前文】
${prefix}

【后文】
${postfix}`;
}

/**
 * Remove duplicate prefix from completion that already exists in the source text
 */
function removeDuplicatePrefix(
	completion: string,
	prefixContext: string
): string {
	if (!completion || !prefixContext) return completion;

	const trimmedCompletion = completion.trim();
	const trimmedPrefix = prefixContext.trim();

	if (!trimmedCompletion || !trimmedPrefix) return completion;

	// Get last few words from prefix (up to 50 characters)
	const prefixEnd = trimmedPrefix.slice(-50);

	// Check if completion starts with any suffix of the prefix
	// This handles cases where LLM repeats the last few words
	for (
		let i = 1;
		i <= Math.min(prefixEnd.length, trimmedCompletion.length);
		i++
	) {
		const prefixSuffix = prefixEnd.slice(-i);
		if (trimmedCompletion.startsWith(prefixSuffix)) {
			// Remove the duplicate part
			return trimmedCompletion.slice(i);
		}
	}

	return completion;
}

/**
 * Remove duplicate suffix from completion that already exists in the postfix
 */
function removeDuplicateSuffix(
	completion: string,
	postfixContext: string
): string {
	if (!completion || !postfixContext) return completion;

	const trimmedCompletion = completion.trim();
	const trimmedPostfix = postfixContext.trim();

	if (!trimmedCompletion || !trimmedPostfix) return completion;

	// Get first few words from postfix (up to 50 characters)
	const postfixStart = trimmedPostfix.slice(0, 50);

	// Check if completion ends with any prefix of the postfix
	for (
		let i = 1;
		i <= Math.min(postfixStart.length, trimmedCompletion.length);
		i++
	) {
		const postfixPrefix = postfixStart.slice(0, i);
		if (trimmedCompletion.endsWith(postfixPrefix)) {
			// Remove the duplicate part
			return trimmedCompletion.slice(0, -i);
		}
	}

	return completion;
}

/**
 * Clean up completion text by removing duplicates and extra whitespace
 */
function cleanCompletion(
	completion: string,
	prefix: string,
	postfix: string
): string {
	let cleaned = completion;

	// Remove duplicate prefix
	cleaned = removeDuplicatePrefix(cleaned, prefix);

	// Remove duplicate suffix
	cleaned = removeDuplicateSuffix(cleaned, postfix);

	// Trim but preserve intentional line breaks
	cleaned = cleaned.replace(/^\s+/, "").replace(/\s+$/, "");

	return cleaned;
}

/**
 * Extract completion from markdown code blocks if present
 */
function extractFromCodeBlock(text: string): string {
	// Check if response is wrapped in code block
	const codeBlockRegex = /```[\w]*\n?([\s\S]*?)```/;
	const match = text.match(codeBlockRegex);

	if (match?.[1]) {
		return match[1].trim();
	}

	return text;
}

/**
 * Remove common markdown artifacts from completion
 */
function removeMarkdownArtifacts(text: string): string {
	let cleaned = text;

	// Remove markdown explanations like "Here's the completion:"
	cleaned = cleaned.replace(
		/^(here'?s? the (completion|continuation|text)[:：]\s*)/i,
		""
	);

	// Remove quotes if the entire text is quoted
	if (
		(cleaned.startsWith('"') && cleaned.endsWith('"')) ||
		(cleaned.startsWith("'") && cleaned.endsWith("'"))
	) {
		cleaned = cleaned.slice(1, -1);
	}

	return cleaned;
}

/**
 * Full post-processing pipeline for completion text
 */
function postProcess(
	completion: string,
	prefix: string,
	postfix: string
): string {
	let processed = completion;

	// Extract from code block if needed
	processed = extractFromCodeBlock(processed);

	// Remove markdown artifacts
	processed = removeMarkdownArtifacts(processed);

	// Clean duplicates
	processed = cleanCompletion(processed, prefix, postfix);

	return processed;
}

/**
 * Complete at cursor position
 */
export async function complete(
	editor: Editor,
	view: MarkdownView,
	app: App,
	settings: MaquillSettings,
	completionManager: InlineCompletionManager,
	getEditorView: (view: MarkdownView) => EditorView | null
): Promise<void> {
	try {
		const notice = new Notice(t("noticeGeneratingCompletion"), 0);

		// Get cursor position
		const cursor = editor.getCursor();

		// Get text before and after cursor
		const prefix = editor.getRange({ line: 0, ch: 0 }, cursor);
		const lastLine = editor.lastLine();
		const lastLineLength = editor.getLine(lastLine).length;
		const postfix = editor.getRange(cursor, {
			line: lastLine,
			ch: lastLineLength,
		});

		if (!prefix.trim() && !postfix.trim()) {
			notice.hide();
			new Notice(t("noticeDocumentEmpty"));
			return;
		}

		// Validate API configuration
		if (!settings.apiKey) {
			notice.hide();
			new Notice(t("noticeConfigureApiKey"));
			return;
		}

		// Call LLM API for completion
		const response = await callZhipuCompletion(settings.apiKey, {
			model: settings.completionModel,
			messages: [
				{
					role: "system",
					content: SYSTEM_PROMPT,
				},
				{
					role: "user",
					content: buildCompletionUserPrompt(prefix, postfix),
				},
			],
			thinking: { type: "disabled" },
			max_tokens: 1024,
		});
		notice.hide();

		// Extract and post-process content from response
		const rawSuggestion =
			response.choices[0]?.message?.content?.trim() || "";
		const suggestion = postProcess(rawSuggestion, prefix, postfix);

		if (!suggestion) {
			new Notice(t("noticeNoCompletionGenerated"));
			return;
		}

		// Show inline completion
		const editorView = getEditorView(view);
		if (editorView) {
			completionManager.showCompletion(
				editorView,
				suggestion,
				() => {
					// Accept: 使用保存的位置插入文本
					completionManager.acceptCompletion(editorView);
				},
				() => {
					// Reject: just clear
					completionManager.clearCompletion(editorView);
				}
			);
		} else {
			new Notice(t("noticeCouldNotAccessEditorView"));
		}
	} catch (error) {
		if (error instanceof Error) {
			new Notice(`${t("noticeError")}: ${error.message}`);
		}
	}
}
