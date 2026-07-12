import type { MaquillSettings } from "./settings";
import type { LLMService } from "./main";
import { getLanguageName } from "./utils/language";

/**
 * System prompt for synonyms
 */
function getSynonymSystemPrompt(): string {
	return `你是一个同义词建议助手。
给定一个单词或短语，提供 3-5 个同义词，与输入语言相同。

规则：
1. 只返回一个 JSON 数组：["synonym1", "synonym2", "synonym3"]
2. 保持与输入相同的语言
3. 提供符合上下文的同义词
4. 不要添加解释`;
}

/**
 * System prompt for antonyms
 */
function getAntonymSystemPrompt(): string {
	return `你是一个反义词建议助手。
给定一个单词或短语，提供 3-5 个反义词，与输入语言相同。

规则：
1. 只返回一个 JSON 数组：["antonym1", "antonym2", "antonym3"]
2. 保持与输入相同的语言
3. 提供符合上下文的反义词
4. 不要添加解释`;
}

function getTranslateSystemPrompt(settings: MaquillSettings): string {
	const targetLanguage = getLanguageName(settings.translationTargetLanguage);
	return `你是一个专业的翻译助手。
请将输入的文本翻译为 ${targetLanguage}。

规则：
1. 只返回翻译后的文本
2. 保持翻译自然准确
3. 不要添加解释或额外内容`;
}

/**
 * System prompt for explanation
 */
function getExplainSystemPrompt(settings: MaquillSettings): string {
	const responseLanguage = getLanguageName(settings.responseLanguage);
	return `你是一个解释助手。
清晰简洁地解释给定单词或短语的含义。

规则：
1. 提供简要的解释
2. 使用简单语言
3. 准确并且有帮助
4. 使用 ${responseLanguage} 回复`;
}

export type ToolbarAction =
	| "synonym"
	| "antonym"
	| "translate"
	| "explain"
	| "grammarCheck";

/**
 * Grammar check result
 */
export type GrammarCheckResult = {
	hasErrors: boolean;
	original: string;
	corrected: string;
	issues?: string[];
};

/**
 * System prompt for grammar check
 */
function getGrammarCheckSystemPrompt(settings: MaquillSettings): string {
	const responseLanguage = getLanguageName(settings.responseLanguage);
	return `你是一个专业的语法检查助手。
检查给定文本的语法错误、拼写错误、标点符号问题和语言表达问题。

要求：
1. 如果文本没有问题，返回 JSON：{"hasErrors": false, "corrected": "原文本"}
2. 如果有问题，返回 JSON：
   {
     "hasErrors": true,
     "corrected": "修正后的完整文本",
     "issues": ["问题1", "问题2"]
   }
3. corrected 字段必须包含修正后的完整文本
4. issues 字段简要说明发现的问题
5. 只返回 JSON，不要添加其他解释
6. 使用 ${responseLanguage} 回复`;
}

/**
 * Parse array response from LLM
 */
function parseArrayResponse(response: string): string[] {
	try {
		const jsonMatch = response.match(/\[[\s\S]*\]/);
		if (jsonMatch) {
			const items = JSON.parse(jsonMatch[0]) as unknown;
			if (Array.isArray(items)) {
				return items.filter((s): s is string => typeof s === "string");
			}
		}
	} catch {
		// Fallback: split by lines
		const lines = response
			.split(/[\n,]/)
			.map((line) =>
				line
					.trim()
					.replace(/^["'\-*\d+.)]+\s*/, "")
					.replace(/["']+$/, "")
			)
			.filter((line) => line.length > 0);
		return lines;
	}
	return [];
}

/**
 * Get synonyms for the given text
 */
export async function getSynonyms(
	text: string,
	settings: MaquillSettings,
	service: LLMService
): Promise<string[]> {
	const response = await service.chat(
		[
			{ role: "system", content: getSynonymSystemPrompt() },
			{ role: "user", content: text },
		],
		settings.completionModel
	);

	return parseArrayResponse(response);
}

/**
 * Get antonyms for the given text
 */
export async function getAntonyms(
	text: string,
	settings: MaquillSettings,
	service: LLMService
): Promise<string[]> {
	const response = await service.chat(
		[
			{ role: "system", content: getAntonymSystemPrompt() },
			{ role: "user", content: text },
		],
		settings.completionModel
	);

	return parseArrayResponse(response);
}

/**
 * Translate text between Chinese and English
 */
export async function translate(
	text: string,
	settings: MaquillSettings,
	service: LLMService
): Promise<string> {
	const response = await service.chat(
		[
			{
				role: "system",
				content: getTranslateSystemPrompt(settings),
			},
			{ role: "user", content: text },
		],
		settings.completionModel
	);

	return response || "Translation failed";
}

/**
 * Explain the meaning of text
 */
export async function explain(
	text: string,
	settings: MaquillSettings,
	service: LLMService
): Promise<string> {
	const response = await service.chat(
		[
			{ role: "system", content: getExplainSystemPrompt(settings) },
			{ role: "user", content: text },
		],
		settings.completionModel
	);

	return response || "Explanation failed";
}

/**
 * Check grammar of the given text
 */
export async function grammarCheck(
	text: string,
	settings: MaquillSettings,
	service: LLMService
): Promise<GrammarCheckResult> {
	const content = await service.chat(
		[
			{
				role: "system",
				content: getGrammarCheckSystemPrompt(settings),
			},
			{ role: "user", content: text },
		],
		settings.completionModel
	);

	// Try to parse JSON response
	try {
		const jsonMatch = content.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const result = JSON.parse(
				jsonMatch[0]
			) as Partial<GrammarCheckResult>;
			return {
				hasErrors: result.hasErrors ?? false,
				original: text,
				corrected: result.corrected || text,
				issues: result.issues,
			};
		}
	} catch {
		// Fallback: treat as plain text response
	}

	// Fallback: no errors detected or parse failed
	return {
		hasErrors: false,
		original: text,
		corrected: text,
	};
}
