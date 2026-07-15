import type { MaquillSettings } from "../settings";
import type { LLMService } from "../types";
import { createLmStudioService } from "./lmstudio";
import { createZhipuService } from "./zhipu";
import { GENERATION_SYSTEM_PROMPT } from "../features/generation";
import {
	COMPLETION_SYSTEM_PROMPT,
	buildCompletionUserPrompt,
} from "../features/completion";

export { fetchLmStudioModels } from "./lmstudio";
export { ZHIPU_MODEL_LIST, type ZhipuModel } from "./zhipu";

/**
 * Provider-dispatching LLMService. Holds one service per provider
 * and picks by `settings.provider` at call time, so changing the
 * provider (or any provider config) in settings applies immediately
 * without reloading the plugin.
 */
export function createService(settings: MaquillSettings): LLMService {
	const services: Record<MaquillSettings["provider"], LLMService> = {
		lmstudio: createLmStudioService(settings, GENERATION_SYSTEM_PROMPT),
		zhipu: createZhipuService(
			settings,
			GENERATION_SYSTEM_PROMPT,
			COMPLETION_SYSTEM_PROMPT,
			buildCompletionUserPrompt,
		),
	};
	const active = () => services[settings.provider];

	return {
		generateStream: (prompt, onChunk, signal) =>
			active().generateStream(prompt, onChunk, signal),
		complete: (prefix, suffix) => active().complete(prefix, suffix),
		chat: (messages, opts) => active().chat(messages, opts),
	};
}
