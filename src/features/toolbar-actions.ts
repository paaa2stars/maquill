import type { MaquillSettings } from "../settings";
import type { ChatMessage, LLMService, OnChunk } from "../types";
import { getLanguageName } from "../utils/language";

export type ToolbarAction =
	| "synonym"
	| "antonym"
	| "translate"
	| "explain"
	| "grammarCheck";

const SYNONYM_SYSTEM_PROMPT = `提供3-5个同义词。只返回JSON数组：["词1","词2"]，保持输入语言，不加解释。`;

const ANTONYM_SYSTEM_PROMPT = `提供3-5个反义词。只返回JSON数组：["词1","词2"]，保持输入语言，不加解释。`;

function getTranslateSystemPrompt(settings: MaquillSettings): string {
	const targetLanguage = getLanguageName(settings.translationTargetLanguage);
	return `翻译为${targetLanguage}，只返回译文，不加解释。`;
}

function getExplainSystemPrompt(settings: MaquillSettings): string {
	const responseLanguage = getLanguageName(settings.responseLanguage);
	return `简要解释给定词语的含义。用${responseLanguage}回复，简洁明了，不加额外说明。`;
}

function getGrammarCheckSystemPrompt(settings: MaquillSettings): string {
	const responseLanguage = getLanguageName(settings.responseLanguage);
	return `检查语法/拼写/标点错误。无问题返回{"hasErrors":false,"corrected":"原文"}；有问题返回{"hasErrors":true,"corrected":"修正文本","issues":["问题"]}。只返回JSON，用${responseLanguage}。`;
}

/**
 * Grammar check result
 */
export type GrammarCheckResult = {
	hasErrors: boolean;
	original: string;
	corrected: string;
	issues?: string[];
};

/** Run a single system+user chat turn. */
function chatWith(
	service: LLMService,
	systemPrompt: string,
	text: string,
	onFirstChunk?: OnChunk
): Promise<string> {
	const messages: ChatMessage[] = [
		{ role: "system", content: systemPrompt },
		{ role: "user", content: text },
	];
	return service.chat(messages, { onFirstChunk });
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
	_settings: MaquillSettings,
	service: LLMService,
	onFirstChunk?: OnChunk
): Promise<string[]> {
	const response = await chatWith(
		service,
		SYNONYM_SYSTEM_PROMPT,
		text,
		onFirstChunk
	);
	return parseArrayResponse(response);
}

/**
 * Get antonyms for the given text
 */
export async function getAntonyms(
	text: string,
	_settings: MaquillSettings,
	service: LLMService,
	onFirstChunk?: OnChunk
): Promise<string[]> {
	const response = await chatWith(
		service,
		ANTONYM_SYSTEM_PROMPT,
		text,
		onFirstChunk
	);
	return parseArrayResponse(response);
}

/**
 * Translate text between languages
 */
export async function translate(
	text: string,
	settings: MaquillSettings,
	service: LLMService,
	onFirstChunk?: OnChunk
): Promise<string> {
	const response = await chatWith(
		service,
		getTranslateSystemPrompt(settings),
		text,
		onFirstChunk
	);
	return response || "Translation failed";
}

/**
 * Explain the meaning of text
 */
export async function explain(
	text: string,
	settings: MaquillSettings,
	service: LLMService,
	onFirstChunk?: OnChunk
): Promise<string> {
	const response = await chatWith(
		service,
		getExplainSystemPrompt(settings),
		text,
		onFirstChunk
	);
	return response || "Explanation failed";
}

/**
 * Check grammar of the given text
 */
export async function grammarCheck(
	text: string,
	settings: MaquillSettings,
	service: LLMService,
	onFirstChunk?: OnChunk
): Promise<GrammarCheckResult> {
	const content = await chatWith(
		service,
		getGrammarCheckSystemPrompt(settings),
		text,
		onFirstChunk
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
