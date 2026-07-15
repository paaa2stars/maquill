import type MaquillPlugin from "../main";
import type { LLMService } from "../types";
import { completeCommand } from "./complete";
import { acceptCompletionCommand } from "./accept-completion";
import { rejectCompletionCommand } from "./reject-completion";
import { generateCommand } from "./generate";

export function registerCommands(plugin: MaquillPlugin, service: LLMService) {
	completeCommand(plugin, service);
	acceptCompletionCommand(plugin);
	rejectCompletionCommand(plugin);
	generateCommand(plugin, service);
}
