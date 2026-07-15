import { requestUrl } from "obsidian";
import type { MaquillSettings } from "../settings";
import type { ChatMessage, LLMService, OnChunk } from "../types";
import {
	collectWithFirstChunk,
	extractChatContent,
	postSseStream,
	type SseChunk,
} from "./sse";

const AUTH_HEADERS = { Authorization: "Bearer lm-studio" };

/**
 * Disable reasoning/thinking so responses start immediately.
 * Without this, reasoning models (e.g. Qwen3) spend seconds — and
 * potentially the whole max_tokens budget — on thinking tokens
 * before emitting any answer. LM Studio ignores this field for
 * models that don't support reasoning.
 */
const REASONING_EFFORT = "none";

type CompletionResponse = {
	choices: Array<{ text?: string }>;
};

/** POST JSON via Obsidian's requestUrl (bypasses CORS, no streaming). */
async function postJson<T>(
	url: string,
	body: Record<string, unknown>,
): Promise<T> {
	const response = await requestUrl({
		url,
		method: "POST",
		contentType: "application/json",
		headers: AUTH_HEADERS,
		body: JSON.stringify(body),
	});

	if (response.status !== 200) {
		throw new Error(
			`LM Studio request failed: ${response.status} - ${response.text}`,
		);
	}

	return response.json as T;
}

/**
 * Whether fetch-based streaming is unavailable (e.g. LM Studio's
 * "Enable CORS" option is off, so the renderer's fetch is blocked).
 * Once a CORS/network failure is seen, skip fetch on later calls.
 */
let fetchStreamBlocked = false;

/**
 * Streaming POST with graceful degradation: real SSE streaming via
 * fetch first; on CORS failure fall back to non-streaming
 * requestUrl and deliver the full content as a single chunk.
 */
async function postJsonStream(
	url: string,
	body: Record<string, unknown>,
	onChunk: OnChunk,
	extractContent: (parsed: SseChunk) => string | undefined,
	signal?: AbortSignal,
): Promise<void> {
	if (!fetchStreamBlocked) {
		try {
			await postSseStream(
				url,
				AUTH_HEADERS,
				body,
				(parsed) => {
					const content = extractContent(parsed);
					if (content) onChunk(content);
				},
				signal,
			);
			return;
		} catch (e) {
			// CORS/network failures surface as TypeError from fetch;
			// HTTP errors and AbortError should propagate.
			if (!(e instanceof TypeError)) throw e;
			fetchStreamBlocked = true;
			console.warn(
				"LM Studio: fetch streaming blocked (enable CORS in LM Studio server settings for true streaming); falling back to non-streaming requestUrl.",
				e,
			);
		}
	}

	const data = await postJson<SseChunk>(url, { ...body, stream: false });
	const content = extractContent(data);
	if (content) {
		onChunk(content);
	}
}

// ── Fetch models ────────────────────────────────────────────────

type ModelsResponse = {
	data: Array<{ id: string }>;
};

export async function fetchLmStudioModels(
	baseUrl: string,
): Promise<string[]> {
	const response = await requestUrl({
		url: `${baseUrl}/v1/models`,
		method: "GET",
		headers: AUTH_HEADERS,
	});

	if (response.status !== 200) {
		throw new Error(
			`Failed to fetch models: ${response.status} - ${response.text}`,
		);
	}

	const data = response.json as ModelsResponse;
	return data.data.map((m) => m.id);
}

// ── Service ─────────────────────────────────────────────────────

/**
 * LM Studio-backed LLMService. Reads base URL and model from
 * `settings` at call time, so settings changes apply immediately.
 */
export const createLmStudioService = (
	settings: MaquillSettings,
	generateSystemPrompt: string,
): LLMService => {
	const chatUrl = () => `${settings.lmstudioBaseUrl}/v1/chat/completions`;
	const completionsUrl = () => `${settings.lmstudioBaseUrl}/v1/completions`;

	return {
		async generateStream(prompt, onChunk, signal) {
			await postJsonStream(
				chatUrl(),
				{
					model: settings.lmstudioModel,
					messages: [
						{ role: "system", content: generateSystemPrompt },
						{ role: "user", content: prompt },
					],
					max_tokens: 1024,
					temperature: 0.3,
					reasoning_effort: REASONING_EFFORT,
				},
				onChunk,
				extractChatContent,
				signal,
			);
		},

		async complete(prefix, suffix) {
			const data = await postJson<CompletionResponse>(
				completionsUrl(),
				{
					model: settings.lmstudioModel,
					prompt: `<PRE> ${prefix} <SUF>${suffix} <MID>`,
					max_tokens: 512,
					temperature: 0.2,
					reasoning_effort: REASONING_EFFORT,
				},
			);
			return data.choices[0]?.text ?? "";
		},

		async chat(messages: ChatMessage[], opts) {
			const collector = collectWithFirstChunk(opts?.onFirstChunk);
			await postJsonStream(
				chatUrl(),
				{
					model: settings.lmstudioModel,
					messages,
					max_tokens: 512,
					temperature: 0.3,
					reasoning_effort: REASONING_EFFORT,
				},
				collector.onChunk,
				extractChatContent,
			);
			return collector.result();
		},
	};
};
