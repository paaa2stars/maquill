export type OnChunk = (chunk: string) => void;

export type ChatMessage = { role: "system" | "user"; content: string };

/**
 * Provider-agnostic LLM service consumed by features
 * (completion, generation, selection toolbar).
 */
export type LLMService = {
	/** Stream generated text for the generation feature. */
	generateStream: (
		prompt: string,
		onChunk: OnChunk,
		signal?: AbortSignal
	) => Promise<void>;
	/** Complete text at the cursor given surrounding context. */
	complete: (prefix: string, suffix: string) => Promise<string>;
	/**
	 * Chat and return the full response. Streams internally;
	 * `onFirstChunk` fires when the first token arrives so callers
	 * can hide loading indicators early.
	 */
	chat: (
		messages: ChatMessage[],
		opts?: { onFirstChunk?: OnChunk }
	) => Promise<string>;
};
