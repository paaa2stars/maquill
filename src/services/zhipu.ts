import { requestUrl } from "obsidian";
import type { MaquillSettings } from "../settings";
import type { ChatMessage, LLMService, OnChunk } from "../types";
import {
	collectWithFirstChunk,
	extractChatContent,
	postSseStream,
} from "./sse";

const ZHIPU_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

export const ZHIPU_MODEL_LIST = [
	"glm-4.7",
	"glm-4.6",
	"glm-4.5-air",
	"glm-4.5-airx",
	"glm-4.5-flash",
	"glm-4-flash-250414",
	"glm-4-flashx-250414",
] as const;

export type ZhipuModel = (typeof ZHIPU_MODEL_LIST)[number];

type ZhipuCompletionParams = {
	model: string;
	messages: ChatMessage[];
	stream?: boolean;
	thinking?: { type?: "enabled" | "disabled" };
	temperature?: number;
	max_tokens?: number;
};

type ZhipuCompletionResponse = {
	choices: Array<{
		message: { role: string; content?: string };
	}>;
};

/** Non-streaming call via requestUrl. */
async function callZhipu(
	apiKey: string,
	params: ZhipuCompletionParams,
): Promise<ZhipuCompletionResponse> {
	const response = await requestUrl({
		url: ZHIPU_API_URL,
		method: "POST",
		contentType: "application/json",
		body: JSON.stringify(params),
		headers: { Authorization: `Bearer ${apiKey}` },
	});

	if (response.status !== 200) {
		throw new Error(
			`Zhipu request failed: ${response.status} - ${response.text}`,
		);
	}

	return response.json as ZhipuCompletionResponse;
}

/** Streaming call via shared SSE helper. */
async function callZhipuStream(
	apiKey: string,
	params: ZhipuCompletionParams,
	onContentChunk: OnChunk,
	signal?: AbortSignal,
): Promise<void> {
	await postSseStream(
		ZHIPU_API_URL,
		{ Authorization: `Bearer ${apiKey}` },
		params,
		(parsed) => {
			const content = extractChatContent(parsed);
			if (content) onContentChunk(content);
		},
		signal,
	);
}

/**
 * Zhipu-backed LLMService. Reads apiKey and models from `settings`
 * at call time, so settings changes apply immediately.
 */
export const createZhipuService = (
	settings: MaquillSettings,
	generateSystemPrompt: string,
	completionSystemPrompt: string,
	buildCompletionUserPrompt: (prefix: string, suffix: string) => string,
): LLMService => ({
	async generateStream(prompt, onChunk, signal) {
		await callZhipuStream(
			settings.apiKey,
			{
				model: settings.generationModel,
				messages: [
					{ role: "system", content: generateSystemPrompt },
					{ role: "user", content: prompt },
				],
				thinking: { type: "disabled" },
				temperature: 0.3,
			},
			onChunk,
			signal,
		);
	},

	async complete(prefix, suffix) {
		const data = await callZhipu(settings.apiKey, {
			model: settings.completionModel,
			messages: [
				{ role: "system", content: completionSystemPrompt },
				{
					role: "user",
					content: buildCompletionUserPrompt(prefix, suffix),
				},
			],
			thinking: { type: "disabled" },
			max_tokens: 1024,
		});
		return data.choices[0]?.message?.content ?? "";
	},

	async chat(messages, opts) {
		const collector = collectWithFirstChunk(opts?.onFirstChunk);
		await callZhipuStream(
			settings.apiKey,
			{
				model: settings.completionModel,
				messages,
				thinking: { type: "disabled" },
				max_tokens: 512,
				temperature: 0.3,
			},
			collector.onChunk,
		);
		return collector.result();
	},
});
