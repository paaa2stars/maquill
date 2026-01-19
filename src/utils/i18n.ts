import { getLanguage } from "obsidian";

/**
 * UI text translations
 */
type Translations = {
	// Settings headings
	settingsLanguageModelConfig: string;
	settingsSelectionToolbar: string;

	// Settings - API
	settingsApiKey: string;
	settingsApiKeyDesc: string;
	settingsApiKeyPlaceholder: string;

	// Settings - Model
	settingsCompletionModel: string;
	settingsCompletionModelDesc: string;
	settingsGenerationModel: string;
	settingsGenerationModelDesc: string;

	// Settings - Language
	settingsResponseLanguage: string;
	settingsResponseLanguageDesc: string;
	settingsLanguageFollowDisplay: string;

	// Settings - Translation
	settingsTranslationTargetLanguage: string;
	settingsTranslationTargetLanguageDesc: string;

	// Settings - Generation
	settingsGenerationConfig: string;
	settingsGenerationSavePath: string;
	settingsGenerationSavePathDesc: string;
	settingsGenerationSavePathPlaceholder: string;

	// Settings - Toolbar
	settingsEnableSelectionToolbar: string;
	settingsEnableSelectionToolbarDesc: string;

	// Toolbar actions
	toolbarActionSynonym: string;
	toolbarActionAntonym: string;
	toolbarActionTranslate: string;
	toolbarActionExplain: string;
	toolbarActionGrammarCheck: string;

	// Toolbar messages
	toolbarProcessing: string;
	toolbarProcessingSynonym: string;
	toolbarProcessingAntonym: string;
	toolbarProcessingTranslate: string;
	toolbarProcessingExplain: string;
	toolbarProcessingGrammarCheck: string;
	toolbarFailed: string;
	toolbarNoTextSelected: string;
	toolbarNoApiKey: string;
	toolbarClose: string;
	toolbarCopy: string;
	toolbarReplace: string;
	toolbarNoResults: string;
	toolbarApplyCorrection: string;
	toolbarNoErrors: string;
	toolbarIssuesFound: string;

	// Notice messages
	noticeGeneratingCompletion: string;
	noticeDocumentEmpty: string;
	noticeConfigureApiKey: string;
	noticeNoCompletionGenerated: string;
	noticeCouldNotAccessEditorView: string;
	noticeError: string;
	noticeGeneratingContent: string;
	noticeCouldNotOpenThinkingView: string;
	noticeNoContentGenerated: string;

	// Command names
	commandCompleteWordSentence: string;
	commandAcceptInlineCompletion: string;
	commandRejectInlineCompletion: string;
	commandGenerateWithPrompt: string;

	// Prompt modal
	promptModalTitle: string;
	promptModalPlaceholder: string;
	promptModalDefaultValue: string;
	promptModalSubmit: string;
	promptModalCancel: string;

	// Thinking view
	thinkingViewTitle: string;
	thinkingViewStop: string;
	thinkingViewWaiting: string;
	thinkingViewStopped: string;

	// Candidate text buttons
	candidateAccept: string;
	candidateReject: string;
};

const ZH_CN: Translations = {
	// Settings headings
	settingsLanguageModelConfig: "语言模型配置",
	settingsSelectionToolbar: "选择工具栏",

	// Settings - API
	settingsApiKey: "API 密钥",
	settingsApiKeyDesc: "智谱 (bigmodel.cn) API 认证密钥",
	settingsApiKeyPlaceholder: "请输入你的 API 密钥",

	// Settings - Model
	settingsCompletionModel: "补全模型",
	settingsCompletionModelDesc: "用于文本补全的模型",
	settingsGenerationModel: "生成模型",
	settingsGenerationModelDesc: "用于文本生成的模型",

	// Settings - Language
	settingsResponseLanguage: "回复语言",
	settingsResponseLanguageDesc: "AI 回复使用的语言",
	settingsLanguageFollowDisplay: "跟随界面语言",

	// Settings - Translation
	settingsTranslationTargetLanguage: "翻译目标语言",
	settingsTranslationTargetLanguageDesc: "翻译功能的目标语言",

	// Settings - Generation
	settingsGenerationConfig: "内容生成",
	settingsGenerationSavePath: "历史记录保存路径",
	settingsGenerationSavePathDesc: "保存生成记录的文件夹路径，留空则不保存",
	settingsGenerationSavePathPlaceholder: "例如：AI/generation",

	// Settings - Toolbar
	settingsEnableSelectionToolbar: "启用选择工具栏",
	settingsEnableSelectionToolbarDesc: "选中文本时显示工具栏",

	// Toolbar actions
	toolbarActionSynonym: "同义词",
	toolbarActionAntonym: "反义词",
	toolbarActionTranslate: "翻译",
	toolbarActionExplain: "解释",
	toolbarActionGrammarCheck: "语法检查",

	// Toolbar messages
	toolbarProcessing: "中...",
	toolbarProcessingSynonym: "获取同义词中...",
	toolbarProcessingAntonym: "获取反义词中...",
	toolbarProcessingTranslate: "翻译中...",
	toolbarProcessingExplain: "解释中...",
	toolbarProcessingGrammarCheck: "语法检查中...",
	toolbarFailed: "失败",
	toolbarNoTextSelected: "未选中文本",
	toolbarNoApiKey: "请在设置中配置 API 密钥",
	toolbarClose: "关闭",
	toolbarCopy: "复制",
	toolbarReplace: "替换",
	toolbarNoResults: "未找到结果",
	toolbarApplyCorrection: "应用修正",
	toolbarNoErrors: "无语法错误",
	toolbarIssuesFound: "发现问题",

	// Notice messages
	noticeGeneratingCompletion: "生成补全中...",
	noticeDocumentEmpty: "文档为空",
	noticeConfigureApiKey: "请在设置中配置 API 密钥",
	noticeNoCompletionGenerated: "未生成补全内容",
	noticeCouldNotAccessEditorView: "无法访问编辑器视图",
	noticeError: "错误",
	noticeGeneratingContent: "生成内容中...",
	noticeCouldNotOpenThinkingView: "无法打开思考视图",
	noticeNoContentGenerated: "未生成内容",

	// Command names
	commandCompleteWordSentence: "补全词语/句子",
	commandAcceptInlineCompletion: "接受建议",
	commandRejectInlineCompletion: "拒绝建议",
	commandGenerateWithPrompt: "根据需求生成内容",

	// Prompt modal
	promptModalTitle: "输入你的需求",
	promptModalPlaceholder: "告诉 AI 你需要什么内容...",
	promptModalDefaultValue: "根据上下文写一段适当的文字",
	promptModalSubmit: "生成",
	promptModalCancel: "取消",

	// Thinking view
	thinkingViewTitle: "思考过程",
	thinkingViewStop: "停止",
	thinkingViewWaiting: "等待生成内容...",
	thinkingViewStopped: "已停止生成",

	// Candidate text buttons
	candidateAccept: "接受",
	candidateReject: "拒绝",
};

const EN: Translations = {
	// Settings headings
	settingsLanguageModelConfig: "Language model configuration",
	settingsSelectionToolbar: "Selection toolbar",

	// Settings - API
	settingsApiKey: "API key",
	settingsApiKeyDesc: "Zhipu (bigmodel.cn) API key for authentication",
	settingsApiKeyPlaceholder: "Enter your API key",

	// Settings - Model
	settingsCompletionModel: "Completion model",
	settingsCompletionModelDesc: "Model for text completion",
	settingsGenerationModel: "Generation model",
	settingsGenerationModelDesc: "Model for text generation",

	// Settings - Language
	settingsResponseLanguage: "Response language",
	settingsResponseLanguageDesc: "Language for AI responses",
	settingsLanguageFollowDisplay: "Follow display language",

	// Settings - Translation
	settingsTranslationTargetLanguage: "Translation target language",
	settingsTranslationTargetLanguageDesc:
		"Target language for translation feature",

	// Settings - Generation
	settingsGenerationConfig: "Content generation",
	settingsGenerationSavePath: "History save path",
	settingsGenerationSavePathDesc:
		"Folder path to save generation history, leave empty to disable",
	settingsGenerationSavePathPlaceholder: "e.g., AI/generation",

	// Settings - Toolbar
	settingsEnableSelectionToolbar: "Enable selection toolbar",
	settingsEnableSelectionToolbarDesc: "Show toolbar when text is selected",

	// Toolbar actions
	toolbarActionSynonym: "Synonym",
	toolbarActionAntonym: "Antonym",
	toolbarActionTranslate: "Translate",
	toolbarActionExplain: "Explain",
	toolbarActionGrammarCheck: "Grammar Check",

	// Toolbar messages
	toolbarProcessing: "...",
	toolbarProcessingSynonym: "Getting synonyms...",
	toolbarProcessingAntonym: "Getting antonyms...",
	toolbarProcessingTranslate: "Translating...",
	toolbarProcessingExplain: "Explaining...",
	toolbarProcessingGrammarCheck: "Checking grammar...",
	toolbarFailed: "Failed",
	toolbarNoTextSelected: "No text selected",
	toolbarNoApiKey: "Please configure your API key in settings",
	toolbarClose: "Close",
	toolbarCopy: "Copy",
	toolbarReplace: "Replace",
	toolbarNoResults: "No results found",
	toolbarApplyCorrection: "Apply Correction",
	toolbarNoErrors: "No grammar errors",
	toolbarIssuesFound: "Issues Found",

	// Notice messages
	noticeGeneratingCompletion: "Generating completion...",
	noticeDocumentEmpty: "Document is empty",
	noticeConfigureApiKey: "Please configure your API key in settings",
	noticeNoCompletionGenerated: "No completion generated",
	noticeCouldNotAccessEditorView: "Could not access editor view",
	noticeError: "Error",
	noticeGeneratingContent: "Generating content...",
	noticeCouldNotOpenThinkingView: "Could not open thinking view",
	noticeNoContentGenerated: "No content generated",

	// Command names
	commandCompleteWordSentence: "Complete word/sentence",
	commandAcceptInlineCompletion: "Accept suggestion",
	commandRejectInlineCompletion: "Reject suggestion",
	commandGenerateWithPrompt: "Generate content from prompt",

	// Prompt modal
	promptModalTitle: "Enter your request",
	promptModalPlaceholder: "Tell AI what content you need...",
	promptModalDefaultValue:
		"Write an appropriate paragraph based on the context",
	promptModalSubmit: "Generate",
	promptModalCancel: "Cancel",

	// Thinking view
	thinkingViewTitle: "Thinking process",
	thinkingViewStop: "Stop",
	thinkingViewWaiting: "Waiting for content...",
	thinkingViewStopped: "Generation stopped",

	// Candidate text buttons
	candidateAccept: "Accept",
	candidateReject: "Reject",
};

/**
 * Get translation for current language
 */
export function t(key: keyof Translations): string {
	const locale = getLanguage();
	// Default to Chinese, switch to English if Obsidian is not using Chinese
	return locale.startsWith("zh") ? ZH_CN[key] : EN[key];
}
