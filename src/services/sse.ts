/**
 * Shared SSE (server-sent events) streaming for OpenAI-compatible
 * chat/completions endpoints, plus a chat-delta extractor used by
 * both providers.
 */

import type { OnChunk } from "../types";

/** A single SSE JSON chunk, already parsed. */
export type SseChunk = Record<string, unknown>;

type ChatChunkShape = {
	choices?: Array<{
		delta?: { content?: string; reasoning_content?: string };
		message?: { content?: string };
	}>;
};

/** Extract incremental/full content from a chat completions chunk. */
export const extractChatContent = (parsed: SseChunk): string | undefined =>
	(parsed as ChatChunkShape).choices?.[0]?.delta?.content ??
	(parsed as ChatChunkShape).choices?.[0]?.message?.content;

/** Extract incremental reasoning/thinking from a chat chunk. */
export const extractChatReasoning = (parsed: SseChunk): string | undefined =>
	(parsed as ChatChunkShape).choices?.[0]?.delta?.reasoning_content;

/**
 * POST `body` to `url` via fetch and parse the SSE response,
 * invoking `onChunk` for each parsed JSON data line.
 *
 * Note: uses fetch (not Obsidian's requestUrl) because requestUrl
 * cannot stream — so this is subject to CORS.
 */
export async function postSseStream(
	url: string,
	headers: Record<string, string>,
	body: Record<string, unknown>,
	onChunk: (parsed: SseChunk) => void,
	signal?: AbortSignal,
): Promise<void> {
	// eslint-disable-next-line no-restricted-globals
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...headers },
		body: JSON.stringify({ ...body, stream: true }),
		signal,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`Streaming request failed: ${response.status} - ${errorText}`,
		);
	}

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error("Response body is not readable");
	}

	const decoder = new TextDecoder();
	let buffer = "";

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (!line.startsWith("data: ")) continue;

				const data = line.slice(6);
				if (data === "[DONE]") continue;

				try {
					onChunk(JSON.parse(data) as SseChunk);
				} catch (e) {
					console.error("Failed to parse SSE chunk:", e);
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

/**
 * Collect a streamed response into a full string, firing
 * `onFirstChunk` when the first content token arrives.
 */
export function collectWithFirstChunk(onFirstChunk?: OnChunk): {
	onChunk: OnChunk;
	result: () => string;
} {
	let result = "";
	let fired = false;
	return {
		onChunk: (chunk) => {
			if (!fired) {
				fired = true;
				onFirstChunk?.(chunk);
			}
			result += chunk;
		},
		result: () => result,
	};
}
