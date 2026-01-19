import {
	App,
	Editor,
	MarkdownView,
	Notice,
	normalizePath,
	WorkspaceLeaf,
} from "obsidian";
import type { EditorView } from "@codemirror/view";
import type { MaquillSettings } from "./settings";
import { callZhipuCompletionStream } from "./zhipu-service";
import { InlineCompletionManager } from "./ui/candidate-text";
import { ThinkingView, THINKING_VIEW_TYPE } from "./ui/thinking-view";
import { PromptModal } from "./ui/prompt-modal";
import { isChineseLanguage } from "./utils/language";
import { t } from "./utils/i18n";

/**
 * System prompt for text generation
 */
const SYSTEM_PROMPT = `
你是一个乐于助人的写作助手，给定【前文】、【后文】和【写作要求】，生成符合要求的内容。

## 输出要求
- 保持与上下文的一致性，除非【写作要求】说要忽略
- 输出语言必须与紧挨着的前后文保持一致，如果不一致就根据上下文语境判断应使用的语言，除非【写作要求】指定了某个语言
- 只输出内容，不要解释
`;

/**
 * Build user prompt for text generation
 */
function buildGenerationUserPrompt(
	prefix: string,
	postfix: string,
	userInstruction: string
): string {
	return `
【前文】
${prefix}

【后文】
${postfix}

【写作要求】
${userInstruction}`;
}

/**
 * Format date as readable filename (YYYY-MM-DD HH-mm-ss)
 */
function formatDateForFilename(date: Date): string {
	const pad = (n: number) => n.toString().padStart(2, "0");
	const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
		date.getDate()
	)}`;
	const timePart = `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(
		date.getSeconds()
	)}`;
	return `${datePart}_${timePart}`;
}

/**
 * Get context snippet (last/first n characters)
 */
function getContextSnippet(
	text: string,
	fromEnd: boolean,
	maxLen = 100
): string {
	const trimmed = text.trim();
	if (trimmed.length <= maxLen) return trimmed;
	if (fromEnd) {
		return "..." + trimmed.slice(-maxLen);
	}
	return trimmed.slice(0, maxLen) + "...";
}

/**
 * Format text as markdown blockquote (each line prefixed with >)
 */
function formatAsBlockquote(text: string, isChinese: boolean): string {
	if (!text) return isChinese ? "(无)" : "(empty)";
	return text
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");
}

/**
 * Save generation history to markdown file
 */
async function saveGenerationHistory(
	app: App,
	savePath: string,
	sourceFile: string,
	prefixContext: string,
	postfixContext: string,
	userPrompt: string,
	thinkingContent: string,
	generatedContent: string,
	isChinese: boolean
): Promise<void> {
	if (!savePath.trim()) return;

	const timestamp = formatDateForFilename(new Date());
	const fileName = `${timestamp}.md`;
	const filePath = normalizePath(`${savePath}/${fileName}`);

	// 获取上下文摘要
	const prefixSnippet = getContextSnippet(prefixContext, true);
	const postfixSnippet = getContextSnippet(postfixContext, false);

	// 根据语言选择文本
	const labels = isChinese
		? {
				title: "内容生成记录",
				context: "上下文",
				source: "来源",
				beforeInsert: "插入位置前",
				afterInsert: "插入位置后",
				userRequest: "用户需求",
				thinking: "思考过程",
				generated: "生成内容",
		  }
		: {
				title: "Generation History",
				context: "Context",
				source: "Source",
				beforeInsert: "Before insertion",
				afterInsert: "After insertion",
				userRequest: "User Request",
				thinking: "Thinking Process",
				generated: "Generated Content",
		  };

	// 构建 markdown 内容
	let content = `# ${labels.title}\n\n`;
	content += `## ${labels.context}\n\n`;
	content += `**${labels.source}**: [[${sourceFile}]]\n\n`;
	content += `**${labels.beforeInsert}**:\n\n${formatAsBlockquote(
		prefixSnippet,
		isChinese
	)}\n\n`;
	content += `**${labels.afterInsert}**:\n\n${formatAsBlockquote(
		postfixSnippet,
		isChinese
	)}\n\n`;
	content += `## ${labels.userRequest}

${userPrompt}

`;

	if (thinkingContent.trim()) {
		content += `## ${labels.thinking}

${thinkingContent}

`;
	}

	content += `## ${labels.generated}\n\n${generatedContent}\n`;

	// 确保目录存在
	const folder = savePath;
	const existingFolder = app.vault.getFolderByPath(normalizePath(folder));
	if (!existingFolder) {
		await app.vault.createFolder(normalizePath(folder));
	}

	// 创建文件
	await app.vault.create(filePath, content);
}

/**
 * Get or create thinking view leaf
 */
async function getThinkingView(app: App): Promise<WorkspaceLeaf | null> {
	const existing = app.workspace.getLeavesOfType(THINKING_VIEW_TYPE);

	if (existing.length > 0 && existing[0]) {
		await app.workspace.revealLeaf(existing[0]);
		return existing[0];
	}

	// Create new leaf in right sidebar
	const leaf = app.workspace.getRightLeaf(false);
	if (leaf) {
		await leaf.setViewState({
			type: THINKING_VIEW_TYPE,
			active: true,
		});
		await app.workspace.revealLeaf(leaf);
		return leaf;
	}

	return null;
}

/**
 * Generate content with user prompt
 */
export function generate(
	editor: Editor,
	view: MarkdownView,
	app: App,
	settings: MaquillSettings,
	completionManager: InlineCompletionManager,
	getEditorView: (view: MarkdownView) => EditorView | null
): void {
	// Show prompt modal first
	new PromptModal(app, (userPrompt) => {
		// Use void IIFE to handle async code
		void (async () => {
			try {
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
					new Notice(t("noticeDocumentEmpty"));
					return;
				}

				// Validate API configuration
				if (!settings.apiKey) {
					new Notice(t("noticeConfigureApiKey"));
					return;
				}

				// Open or reveal thinking view
				const thinkingLeaf = await getThinkingView(app);
				if (!thinkingLeaf) {
					new Notice(t("noticeCouldNotOpenThinkingView"));
					return;
				}

				const thinkingView = thinkingLeaf.view as ThinkingView;
				thinkingView.clearThinking();

				// Setup abort controller for cancellation
				const abortController = new AbortController();
				thinkingView.setStopCallback(() => {
					abortController.abort();
				});

				// Stream content
				const notice = new Notice(t("noticeGeneratingContent"), 0);
				let generatedContent = "";
				let thinkingContent = "";
				let wasStopped = false;

				try {
					await callZhipuCompletionStream(
						settings.apiKey,
						{
							model: settings.generationModel,
							messages: [
								{
									role: "system",
									content: SYSTEM_PROMPT,
								},
								{
									role: "user",
									content: buildGenerationUserPrompt(
										prefix,
										postfix,
										userPrompt
									),
								},
							],
						},
						(thinkingChunk) => {
							// Store and display thinking content
							thinkingContent += thinkingChunk;
							thinkingView.appendThinking(thinkingChunk);
						},
						(contentChunk) => {
							// Accumulate content
							generatedContent += contentChunk;
						},
						abortController.signal
					);
				} catch (error) {
					if (error instanceof Error && error.name === "AbortError") {
						wasStopped = true;
						thinkingView.appendStoppedMessage();
					} else {
						throw error;
					}
				} finally {
					// Hide stop button when done
					thinkingView.setStopCallback(null);
				}

				notice.hide();

				if (!generatedContent.trim()) {
					if (!wasStopped) {
						new Notice(t("noticeNoContentGenerated"));
					}
					return;
				}

				if (settings.generationSavePath) {
					const sourceFile = view.file?.basename ?? "Untitled";
					const isChinese = isChineseLanguage(
						settings.responseLanguage
					);
					void saveGenerationHistory(
						app,
						settings.generationSavePath,
						sourceFile,
						prefix,
						postfix,
						userPrompt,
						thinkingContent,
						generatedContent,
						isChinese
					);
				}

				// Show inline completion
				const editorView = getEditorView(view);
				if (editorView) {
					completionManager.showCompletion(
						editorView,
						generatedContent,
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
		})();
	}).open();
}
