import type MaquillPlugin from "../main";
import { completeCommand } from "./complete";
import { acceptCompletionCommand } from "./accept-completion";
import { rejectCompletionCommand } from "./reject-completion";
import { generateCommand } from "./generate";

export function registerCommands(plugin: MaquillPlugin) {
	completeCommand(plugin);
	acceptCompletionCommand(plugin);
	rejectCompletionCommand(plugin);
	generateCommand(plugin);
}
