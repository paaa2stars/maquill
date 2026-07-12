import { MarkdownView, Plugin, WorkspaceLeaf } from "obsidian";
import {
	MaquillSettings,
	DEFAULT_SETTINGS,
	MaquillSettingTab,
	type ModelProvider,
} from "./settings";
import {
	InlineCompletionManager,
	candidateTextState,
} from "./ui/candidate-text";
import { ThinkingView, THINKING_VIEW_TYPE } from "./ui/thinking-view";
import { SelectionToolbar } from "./ui/selection-toolbar";
import { registerCommands } from "./commands";
import { callZhipuCompletion, callZhipuCompletionStream, type ZhipuModel } from "./zhipu-service";
import { createLmStudioService, postJson } from "./lmstudio-service";
import {
	COMPLETION_SYSTEM_PROMPT,
	buildCompletionUserPrompt,
} from "./completion";
import { GENERATION_SYSTEM_PROMPT } from "./generation";
import type { EditorView } from "@codemirror/view";

type OnChunk = (chunk: string) => void;

type ChatMessage = { role: "system" | "user"; content: string };

export type LLMService = {
	generate: {
		(prompt: string): Promise<string>;
		(prompt: string, onChunk: OnChunk): Promise<void>;
	};
	generateStream: (
		prompt: string,
		onChunk: OnChunk,
		signal?: AbortSignal
	) => Promise<void>;
	complete: {
		(prefix: string, suffix: string): Promise<string>;
		(prefix: string, suffix: string, onChunk: OnChunk): Promise<void>;
	};
	completeStream: (
		prefix: string,
		suffix: string,
		onChunk: OnChunk,
		signal?: AbortSignal
	) => Promise<void>;
	chat: (messages: ChatMessage[], model: string) => Promise<string>;
};

function createService(
	provider: ModelProvider,
	settings: MaquillSettings
): LLMService {
	if (provider === "lmstudio") {
		const lm = createLmStudioService(
			settings.lmstudioBaseUrl,
			settings.lmstudioModel
		);
		return {
			generate: lm.generate,
			generateStream: lm.generateStream,
			complete: lm.complete,
			completeStream: lm.completeStream,
			chat: async (messages: ChatMessage[], _model: string) => {
				const data = await postJson<{
					choices: Array<{ message?: { content?: string } }>;
				}>(
					`${settings.lmstudioBaseUrl}/v1/chat/completions`,
					{ model: settings.lmstudioModel, messages }
				);
				return data.choices[0]?.message?.content ?? "";
			},
		};
	}

	// Zhipu provider
	return {
		generate: async (prompt: string, onChunk?: OnChunk): Promise<string | void> => {
			const messages = [
				{ role: "system" as const, content: GENERATION_SYSTEM_PROMPT },
				{ role: "user" as const, content: prompt },
			];
			if (onChunk) {
				await callZhipuCompletionStream(
					settings.apiKey,
					{ model: settings.generationModel, messages },
					() => {},
					onChunk
				);
				return;
			}
			const data = await callZhipuCompletion(settings.apiKey, {
				model: settings.generationModel,
				messages,
			});
			return data.choices[0]?.message?.content ?? "";
		},
		generateStream: async (
			prompt: string,
			onChunk: OnChunk,
			signal?: AbortSignal
		) => {
			await callZhipuCompletionStream(
				settings.apiKey,
				{
					model: settings.generationModel,
					messages: [
						{ role: "system" as const, content: GENERATION_SYSTEM_PROMPT },
						{ role: "user" as const, content: prompt },
					],
				},
				() => {},
				onChunk,
				signal
			);
		},
		complete: async (prefix: string, suffix: string, onChunk?: OnChunk): Promise<string | void> => {
			const messages = [
				{ role: "system" as const, content: COMPLETION_SYSTEM_PROMPT },
				{ role: "user" as const, content: buildCompletionUserPrompt(prefix, suffix) },
			];
			if (onChunk) {
				await callZhipuCompletionStream(
					settings.apiKey,
					{
						model: settings.completionModel,
						messages,
						thinking: { type: "disabled" },
						max_tokens: 1024,
					},
					() => {},
					onChunk
				);
				return;
			}
			const data = await callZhipuCompletion(settings.apiKey, {
				model: settings.completionModel,
				messages,
				thinking: { type: "disabled" },
				max_tokens: 1024,
			});
			return data.choices[0]?.message?.content ?? "";
		},
		completeStream: async (
			prefix: string,
			suffix: string,
			onChunk: OnChunk,
			signal?: AbortSignal
		) => {
			await callZhipuCompletionStream(
				settings.apiKey,
				{
					model: settings.completionModel,
					messages: [
						{ role: "system" as const, content: COMPLETION_SYSTEM_PROMPT },
						{ role: "user" as const, content: buildCompletionUserPrompt(prefix, suffix) },
					],
					thinking: { type: "disabled" },
					max_tokens: 1024,
				},
				() => {},
				onChunk,
				signal
			);
		},
		chat: async (messages: ChatMessage[], model: string) => {
			const data = await callZhipuCompletion(settings.apiKey, {
				model: model as ZhipuModel,
				messages,
				thinking: { type: "disabled" },
			});
			return data.choices[0]?.message?.content ?? "";
		},
	} as LLMService;
}

export type { ChatMessage };

export default class MaquillPlugin extends Plugin {
	settings: MaquillSettings;
	inlineCompletionManager: InlineCompletionManager;
	selectionToolbar: SelectionToolbar | null = null;

	async onload() {
		await this.loadSettings();

		// Initialize inline completion manager
		this.inlineCompletionManager = new InlineCompletionManager(this.app);

		// Initialize selection toolbar
		const service = createService(this.settings.provider, this.settings);
		this.selectionToolbar = new SelectionToolbar(this.app, this.settings, service);

		// Listen for mouse up events to detect text selection
		this.registerDomEvent(document, "mouseup", () => {
			if (!this.settings.enableSelectionToolbar) return;
			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				const editor = activeView.editor;
				setTimeout(() => {
					// 再次检查设置，因为在 setTimeout 延迟期间设置可能已更改
					if (!this.settings.enableSelectionToolbar) return;
					if (editor.somethingSelected()) {
						this.selectionToolbar?.show(editor, activeView);
					} else {
						this.selectionToolbar?.hide();
					}
				}, 10);
			}
		});

		// Listen for keyup events (for keyboard selection)
		this.registerDomEvent(document, "keyup", () => {
			if (!this.settings.enableSelectionToolbar) return;
			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				const editor = activeView.editor;
				setTimeout(() => {
					// 再次检查设置，因为在 setTimeout 延迟期间设置可能已更改
					if (!this.settings.enableSelectionToolbar) return;
					if (editor.somethingSelected()) {
						this.selectionToolbar?.show(editor, activeView);
					} else {
						this.selectionToolbar?.hide();
					}
				}, 10);
			}
		});

		// 当活动视图改变时隐藏工具栏
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.selectionToolbar?.hide();
			})
		);

		// 当布局变化时隐藏工具栏（包括打开设置等模态框）
		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				this.selectionToolbar?.hide();
			})
		);

		// Register editor extension for candidate text
		this.registerEditorExtension([candidateTextState]);

		// Register thinking view
		this.registerView(
			THINKING_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new ThinkingView(leaf)
		);

		// Register commands
		registerCommands(this, service);

		// Settings tab
		this.addSettingTab(new MaquillSettingTab(this.app, this));
	}

	/**
	 * Get CodeMirror EditorView from Obsidian MarkdownView
	 */
	getEditorView(view: MarkdownView): EditorView | null {
		// Access the CodeMirror editor view from Obsidian's view
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
		const editor = (view as any).editor;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (editor?.cm) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			return editor.cm as EditorView;
		}
		return null;
	}

	onunload() {
		// Cleanup
		if (this.selectionToolbar) {
			this.selectionToolbar.destroy();
			this.selectionToolbar = null;
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MaquillSettings>
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// 刷新工具栏以应用新设置
		if (this.settings.enableSelectionToolbar) {
			this.selectionToolbar?.refresh();
		} else {
			// 如果禁用，直接调用 refresh 彻底移除 DOM 元素
			this.selectionToolbar?.refresh();
		}
	}
}
