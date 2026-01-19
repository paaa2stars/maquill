import {
	EditorView,
	Decoration,
	DecorationSet,
	WidgetType,
} from "@codemirror/view";
import { StateField, StateEffect } from "@codemirror/state";
import type { App } from "obsidian";
import { t } from "../utils/i18n";

/**
 * State effect to set candidate text
 */
export const setCandidateTextEffect = StateEffect.define<{
	pos: number;
	text: string;
	onAccept: () => void;
	onReject: () => void;
} | null>();

/**
 * Widget to display candidate text with action buttons
 */
class CandidateTextWidget extends WidgetType {
	constructor(
		readonly text: string,
		readonly onAccept: () => void,
		readonly onReject: () => void
	) {
		super();
	}

	toDOM(): HTMLElement {
		const container = document.createElement("span");
		container.className = "maquill-candidate-text-container";

		// Ghost text
		const textSpan = document.createElement("span");
		textSpan.className = "maquill-candidate-text";
		textSpan.textContent = this.text;
		container.appendChild(textSpan);

		// Button container
		const buttonContainer = document.createElement("span");
		buttonContainer.className = "maquill-candidate-buttons";

		// Accept button
		const acceptBtn = document.createElement("button");
		acceptBtn.className = "maquill-candidate-btn maquill-accept-btn";
		const acceptIcon = document.createElement("span");
		acceptIcon.textContent = "✓ ";
		acceptBtn.appendChild(acceptIcon);
		acceptBtn.appendChild(document.createTextNode(t("candidateAccept")));
		// 使用 mousedown + preventDefault 阻止焦点转移，避免触发 selection 变化导致 candidate text 被提前清除
		acceptBtn.onmousedown = (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.onAccept();
		};
		buttonContainer.appendChild(acceptBtn);

		// Reject button
		const rejectBtn = document.createElement("button");
		rejectBtn.className = "maquill-candidate-btn maquill-reject-btn";
		const rejectIcon = document.createElement("span");
		rejectIcon.textContent = "✗ ";
		rejectBtn.appendChild(rejectIcon);
		rejectBtn.appendChild(document.createTextNode(t("candidateReject")));
		// 使用 mousedown + preventDefault 阻止焦点转移，避免触发 selection 变化导致 candidate text 被提前清除
		rejectBtn.onmousedown = (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.onReject();
		};
		buttonContainer.appendChild(rejectBtn);

		container.appendChild(buttonContainer);

		return container;
	}

	eq(other: CandidateTextWidget): boolean {
		return this.text === other.text;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

/**
 * State field to track current candidate text
 */
export const candidateTextState = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},

	update(decorations, tr) {
		// Map existing decorations through the transaction
		decorations = decorations.map(tr.changes);

		// Check for candidate text effects
		for (const effect of tr.effects) {
			if (effect.is(setCandidateTextEffect)) {
				if (effect.value === null) {
					// Clear candidate text
					decorations = Decoration.none;
				} else {
					// Set new candidate text
					const { pos, text, onAccept, onReject } = effect.value;
					const widget = Decoration.widget({
						widget: new CandidateTextWidget(
							text,
							onAccept,
							onReject
						),
						side: 1,
					});
					decorations = Decoration.set([widget.range(pos)]);
				}
			}
		}

		// Clear candidate text if user types or cursor moves
		if (tr.docChanged || tr.selection) {
			decorations = Decoration.none;
		}

		return decorations;
	},

	provide: (field) => EditorView.decorations.from(field),
});

/**
 * Candidate text manager
 */
export class InlineCompletionManager {
	private currentCompletion: string | null = null;
	private currentPosition: number | null = null;
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Show candidate text at current cursor position
	 */
	showCompletion(
		view: EditorView,
		text: string,
		onAccept: () => void,
		onReject: () => void
	): void {
		const pos = view.state.selection.main.head;
		this.currentCompletion = text;
		this.currentPosition = pos;

		view.dispatch({
			effects: setCandidateTextEffect.of({
				pos,
				text,
				onAccept,
				onReject,
			}),
		});
	}

	/**
	 * Accept current candidate text
	 */
	acceptCompletion(view: EditorView): boolean {
		if (!this.currentCompletion || this.currentPosition === null) {
			return false;
		}

		const pos = this.currentPosition;
		const text = this.currentCompletion;

		// Clear candidate text first
		this.clearCompletion(view);

		// Insert the text
		view.dispatch({
			changes: { from: pos, to: pos, insert: text },
			selection: { anchor: pos + text.length },
		});

		return true;
	}

	/**
	 * Reject/clear current candidate text
	 */
	clearCompletion(view: EditorView): void {
		this.currentCompletion = null;
		this.currentPosition = null;

		view.dispatch({
			effects: setCandidateTextEffect.of(null),
		});
	}

	/**
	 * Check if there's an active completion
	 */
	hasCompletion(): boolean {
		return this.currentCompletion !== null;
	}
}
