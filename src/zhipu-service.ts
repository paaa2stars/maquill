import { requestUrl } from "obsidian";

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

export type ZhipuCompletionParams = {
	model: ZhipuModel;
	messages: Array<
		| {
				role: "system" | "user";
				content: string;
		  }
		| {
				role: "assistant";
				content?: string;
				tool_calls?: Array<{
					id: string;
					type: "function" | "web_search" | "retrieval";
					function?: {
						name: string;
						arguments: string;
					};
				}>;
		  }
		| {
				role: "tool";
				content: string;
				tool_call_id?: string;
		  }
	>;
	stream?: boolean; // default: false
	thinking?: { type?: "enabled" | "disabled"; clear_thinking?: boolean }; // default: { type: "enabled", clear_thinking: true }
	do_sample?: boolean; // default: true
	temperature?: number; // default: 1, 较高的值输出更随机、更有创造性，不要同时调整 temperature 和 top_p
	top_p?: number; // default: 0.95, 较大的值会增加输出的多样性
	max_tokens?: number; // 1 <= x <= 131072, 建议不小于 1024
	tool_stream?: boolean; // default: false
	tools?: Array<
		| {
				type: "function";
				function: {
					name: string;
					description: string;
					parameters: object;
				};
		  }
		| {
				type: "retrieval";
				retrieval: { knowledge_id: string; prompt_template?: string };
		  }
		| {
				type: "web_search";
				web_search?: {
					search_engine:
						| "search_std"
						| "search_pro"
						| "search_pro_sogou"
						| "search_pro_quark"; // default: "search_std"
					enable?: boolean; // default: false
					search_query?: string;
					search_intent?: "true" | "false";
					count?: number; // 1 <= x <= 50, default: 10
					search_domain_filter?:
						| "search_std"
						| "search_pro"
						| "search_pro_sogou";
					search_recency_filter?:
						| "oneDay"
						| "oneWeek"
						| "oneMonth"
						| "oneYear"
						| "noLimit"; // default: "noLimit"
					content_size?: "medium" | "high"; // default: "medium"
					result_sequence?: "before" | "after"; // default: "after"
					search_result?: boolean; // default: false
					require_search?: boolean; // default: false
					search_prompt?: string;
				};
		  }
		| {
				type: "mcp";
				mcp?: {
					server_label: string;
					server_url?: string;
					transport_type?: "sse" | "streamable-http"; // default: streamable-http
					allowed_tools?: string[];
					headers?: object;
				};
		  }
	>;
	tool_choice?: "auto";
	stop?: string[]; // 最大一个
};

export type ZhipuCompletionResponse = {
	id: string;
	request_id: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		message: {
			role: string;
			content?: string;
			reasoning_content?: string;
			audio?: object;
			tool_calls?: object[];
			finish_reason?: string;
		};
	}>;
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
		prompt_tokens_details?: { cached_tokens?: number };
		total_tokens?: number;
	};
	web_search?: object[];
	content_filter?: object[];
};

export async function callZhipuCompletion(
	apiKey: string,
	params?: ZhipuCompletionParams
): Promise<ZhipuCompletionResponse> {
	console.debug("callZhipuCompletion params:", params);

	const request = {
		url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
		method: "POST",
		contentType: "application/json",
		body: JSON.stringify(params),
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	};

	const response = await requestUrl(request);

	if (response.status !== 200) {
		const errorText = response.text;
		throw new Error(
			`callZhipuCompletion failed: ${response.status} - ${errorText}`
		);
	}

	const data = response.json as ZhipuCompletionResponse;

	console.debug("callZhipuCompletion response:", data);

	return data;
}

/**
 * Call Zhipu API with stream support
 */
export async function callZhipuCompletionStream(
	apiKey: string,
	params: ZhipuCompletionParams,
	onThinkingChunk: (chunk: string) => void,
	onContentChunk: (chunk: string) => void,
	signal?: AbortSignal
): Promise<void> {
	// Force enable stream
	const streamParams = { ...params, stream: true };
	console.debug("callZhipuCompletionStream params:", streamParams);

	// Use fetch for streaming support (requestUrl doesn't support streaming)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, no-restricted-globals
	const response = await (fetch as any)(
		"https://open.bigmodel.cn/api/paas/v4/chat/completions",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(streamParams),
			signal,
		}
	);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	if (!response.ok) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		const errorText = await response.text();
		throw new Error(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			`callZhipuCompletionStream failed: ${response.status} - ${errorText}`
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error("Response body is not readable");
	}

	const decoder = new TextDecoder();
	let buffer = "";

	try {
		while (true) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			const { done, value } = await reader.read();
			if (done) break;

			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
					const delta = parsed.choices?.[0]?.delta;

					if (delta) {
						// Thinking content
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						if (delta.reasoning_content) {
							// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
							onThinkingChunk(delta.reasoning_content);
						}

						// Main content
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						if (delta.content) {
							// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
							onContentChunk(delta.content);
						}
					}
				} catch (e) {
					console.error("Failed to parse stream chunk:", e);
				}
			}
		}
	} finally {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		reader.releaseLock();
	}
}
