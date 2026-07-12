import { requestUrl } from "obsidian";

type OnChunk = (chunk: string) => void;

type ChatChoice = {
	index: number;
	message?: { role: string; content?: string };
	delta?: { content?: string };
	text?: string;
	finish_reason?: string;
};

type ChatCompletionResponse = {
	id: string;
	created: number;
	model: string;
	choices: ChatChoice[];
};

type CompletionResponse = {
	id: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		text?: string;
		finish_reason?: string;
	}>;
};

/**
 * Parse SSE stream and invoke onChunk for each content piece.
 * Shared helper for both chat-completions and completions streaming.
 */
async function parseSseStream(
	response: Response,
	onChunk: OnChunk,
	extractContent: (parsed: Record<string, unknown>) => string | undefined
): Promise<void> {
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
				if (!line.trim() || !line.startsWith("data: ")) continue;

				const data = line.slice(6);
				if (data === "[DONE]") continue;

				try {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const parsed = JSON.parse(data);
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					const content = extractContent(parsed);
					if (content) {
						onChunk(content);
					}
				} catch (e) {
					console.error("Failed to parse stream chunk:", e);
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

/**
 * Non-streaming POST using Obsidian's requestUrl.
 */
export async function postJson<T>(
	url: string,
	body: Record<string, unknown>
): Promise<T> {
	const response = await requestUrl({
		url,
		method: "POST",
		contentType: "application/json",
		body: JSON.stringify(body),
		headers: {
			Authorization: "Bearer lm-studio",
		},
	});

	if (response.status !== 200) {
		throw new Error(
			`LM Studio request failed: ${response.status} - ${response.text}`
		);
	}

	return response.json as T;
}

/**
 * Streaming POST using native fetch.
 */
async function postJsonStream(
	url: string,
	body: Record<string, unknown>,
	onChunk: OnChunk,
	extractContent: (parsed: Record<string, unknown>) => string | undefined,
	signal?: AbortSignal
): Promise<void> {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, no-restricted-globals
		const response = (await (fetch as any)(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer lm-studio",
			},
			body: JSON.stringify(body),
			signal,
		})) as Response;

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`LM Studio request failed: ${response.status} - ${errorText}`
			);
		}

		await parseSseStream(response, onChunk, extractContent);
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw error;
		}
		if (error instanceof TypeError && error.message.includes("fetch")) {
			throw new Error(
				"无法连接到 LM Studio，请确保 LM Studio 正在运行"
			);
		}
		throw error;
	}
}

// ── Fetch models ────────────────────────────────────────────────

type ModelsResponse = {
	data: Array<{ id: string }>;
};

export async function fetchLmStudioModels(
	baseUrl: string
): Promise<string[]> {
	const response = await requestUrl({
		url: `${baseUrl}/v1/models`,
		method: "GET",
		headers: {
			Authorization: "Bearer lm-studio",
		},
	});

	if (response.status !== 200) {
		throw new Error(
			`Failed to fetch models: ${response.status} - ${response.text}`
		);
	}

	const data = response.json as ModelsResponse;
	return data.data.map((m) => m.id);
}

// ── Public factory ──────────────────────────────────────────────

export const createLmStudioService = (baseUrl: string, model: string) => {
	const chatUrl = `${baseUrl}/v1/chat/completions`;
	const completionsUrl = `${baseUrl}/v1/completions`;

	/** Generate text via chat completions (non-streaming). */
	async function generateFn(prompt: string): Promise<string>;
	/** Generate text via chat completions (streaming). */
	async function generateFn(
		prompt: string,
		onChunk: OnChunk
	): Promise<void>;
	async function generateFn(
		prompt: string,
		onChunk?: OnChunk
	): Promise<string | void> {
		if (onChunk) {
			await postJsonStream(
				chatUrl,
				{
					model,
					messages: [
						{
							role: "system",
							content: "You are a helpful writing assistant.",
						},
						{ role: "user", content: prompt },
					],
					stream: true,
				},
				onChunk,
				(parsed) =>
					(parsed as { choices?: ChatChoice[] }).choices?.[0]?.delta
						?.content,
			);
			return;
		}

		const data = await postJson<ChatCompletionResponse>(chatUrl, {
			model,
			messages: [
				{
					role: "system",
					content: "You are a helpful writing assistant.",
				},
				{ role: "user", content: prompt },
			],
		});

		return data.choices[0]?.message?.content ?? "";
	}

	/** Generate text via chat completions (streaming with AbortSignal). */
	async function generateStream(
		prompt: string,
		onChunk: OnChunk,
		signal?: AbortSignal
	): Promise<void> {
		await postJsonStream(
			chatUrl,
			{
				model,
				messages: [
					{
						role: "system",
						content: "You are a helpful writing assistant.",
					},
					{ role: "user", content: prompt },
				],
				stream: true,
			},
			onChunk,
			(parsed) =>
				(parsed as { choices?: ChatChoice[] }).choices?.[0]?.delta
					?.content,
			signal,
		);
	}

	/** Complete text via completions endpoint (non-streaming). */
	async function completeFn(prefix: string, suffix: string): Promise<string>;
	/** Complete text via completions endpoint (streaming). */
	async function completeFn(
		prefix: string,
		suffix: string,
		onChunk: OnChunk
	): Promise<void>;
	async function completeFn(
		prefix: string,
		suffix: string,
		onChunk?: OnChunk
	): Promise<string | void> {
		const infillPrompt = `<PRE> ${prefix} <SUF>${suffix} <MID>`;

		if (onChunk) {
			await postJsonStream(
				completionsUrl,
				{ model, prompt: infillPrompt, stream: true },
				onChunk,
				(parsed) =>
					(parsed as CompletionResponse).choices?.[0]?.text,
			);
			return;
		}

		const data = await postJson<CompletionResponse>(completionsUrl, {
			model,
			prompt: infillPrompt,
		});

		return data.choices[0]?.text ?? "";
	}

	/** Complete text via completions endpoint (streaming with AbortSignal). */
	async function completeStream(
		prefix: string,
		suffix: string,
		onChunk: OnChunk,
		signal?: AbortSignal
	): Promise<void> {
		const infillPrompt = `<PRE> ${prefix} <SUF>${suffix} <MID>`;

		await postJsonStream(
			completionsUrl,
			{ model, prompt: infillPrompt, stream: true },
			onChunk,
			(parsed) =>
				(parsed as CompletionResponse).choices?.[0]?.text,
			signal,
		);
	}

	return {
		generate: generateFn,
		generateStream,
		complete: completeFn,
		completeStream,
	};
};
