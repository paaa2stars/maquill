import { Component, Editor, MarkdownRenderer, Notice } from "obsidian";
import type { App } from "obsidian";
import { t } from "../utils/i18n";
import { type GrammarCheckResult, type ToolbarAction } from "../features/toolbar-actions";

export function showResult(
	app: App,
	actionId: ToolbarAction,
	actionLabel: string,
	original: string,
	result: string | string[] | GrammarCheckResult,
	editor: Editor
): void {
	const modal = document.createElement("div");
	modal.className = "maquill-result-modal";

	const overlay = document.createElement("div");
	overlay.className = "maquill-result-overlay";

	const component = new Component();

	const cleanup = () => {
		component.unload();
		if (modal.parentNode) modal.parentNode.removeChild(modal);
		if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
	};

	overlay.onclick = cleanup;

	const content = document.createElement("div");
	content.className = "maquill-result-content";

	// Title
	const title = document.createElement("h3");
	title.textContent = `${actionLabel}: ${original}`;
	content.appendChild(title);

	// Check if result is array (for synonym/antonym)
	const isReplaceable =
		Array.isArray(result) &&
		(actionId === "synonym" || actionId === "antonym");
	// Check if result is grammar check result
	const isGrammarCheck =
		actionId === "grammarCheck" &&
		typeof result === "object" &&
		!Array.isArray(result) &&
		"hasErrors" in result;

	if (isGrammarCheck) {
		const grammarResult = result;

		if (!grammarResult.hasErrors) {
			// No errors found
			const noErrors = document.createElement("div");
			noErrors.className = "maquill-result-text maquill-no-errors";
			noErrors.textContent = t("toolbarNoErrors");
			content.appendChild(noErrors);
		} else {
			// Show issues
			if (grammarResult.issues && grammarResult.issues.length > 0) {
				const issuesTitle = document.createElement("div");
				issuesTitle.className = "maquill-issues-title";
				issuesTitle.textContent = t("toolbarIssuesFound") + ":";
				content.appendChild(issuesTitle);

				const issuesList = document.createElement("ul");
				issuesList.className = "maquill-issues-list";
				for (const issue of grammarResult.issues) {
					const issueItem = document.createElement("li");
					issueItem.textContent = issue;
					issuesList.appendChild(issueItem);
				}
				content.appendChild(issuesList);
			}

			// Show corrected text
			const correctedTitle = document.createElement("div");
			correctedTitle.className = "maquill-corrected-title";
			correctedTitle.textContent = t("toolbarApplyCorrection") + ":";
			content.appendChild(correctedTitle);

			const correctedDiv = document.createElement("div");
			correctedDiv.className =
				"maquill-result-text maquill-corrected-text";
			correctedDiv.textContent = grammarResult.corrected;
			content.appendChild(correctedDiv);
		}
	}

	// 用于同义词/反义词的选中状态
	let selectedWord: string | null = null;
	let selectedItem: HTMLElement | null = null;
	let replaceBtn: HTMLButtonElement | null = null;

	if (isReplaceable && result.length > 0) {
		// 过滤掉原词
		const filteredWords = result.filter(
			(word) => word.toLowerCase() !== original.toLowerCase()
		);

		if (filteredWords.length > 0) {
			// Show replaceable word list with selection support
			const wordList = document.createElement("div");
			wordList.className =
				"maquill-word-list maquill-word-list-selectable";

			for (const word of filteredWords) {
				const wordItem = document.createElement("span");
				wordItem.className =
					"maquill-word-item maquill-word-item-selectable";
				wordItem.textContent = word;

				wordItem.onclick = () => {
					// 如果是选中文本行为，不处理点击选择
					const selection = window.getSelection();
					if (selection && selection.toString().length > 0) {
						return;
					}

					// 取消之前的选中
					if (selectedItem) {
						selectedItem.removeClass("is-selected");
					}

					// 选中当前项
					selectedWord = word;
					selectedItem = wordItem;
					wordItem.addClass("is-selected");

					// 启用替换按钮
					if (replaceBtn) {
						replaceBtn.disabled = false;
						replaceBtn.removeClass("is-disabled");
					}
				};
				wordList.appendChild(wordItem);
			}

			content.appendChild(wordList);
		} else {
			// 过滤后没有结果
			const noResults = document.createElement("div");
			noResults.className = "maquill-result-text";
			noResults.textContent = t("toolbarNoResults");
			content.appendChild(noResults);
		}
	} else if (isReplaceable && result.length === 0) {
		// No results found
		const noResults = document.createElement("div");
		noResults.className = "maquill-result-text";
		noResults.textContent = t("toolbarNoResults");
		content.appendChild(noResults);
	} else if (!isGrammarCheck) {
		// Normal text result (for translate, explain)
		const resultText =
			typeof result === "string"
				? result
				: Array.isArray(result)
				? result.join(", ")
				: "";
		if (resultText) {
			const resultDiv = document.createElement("div");
			resultDiv.className = "maquill-result-text";
			void MarkdownRenderer.render(
				app,
				resultText,
				resultDiv,
				"",
				component
			);
			content.appendChild(resultDiv);
		}
	}

	// Button container
	const buttonContainer = document.createElement("div");
	buttonContainer.className = "maquill-result-buttons";

	// Apply correction button (only for grammar check with errors)
	if (
		isGrammarCheck &&
		typeof result === "object" &&
		!Array.isArray(result) &&
		result.hasErrors
	) {
		const applyBtn = document.createElement("button");
		applyBtn.textContent = t("toolbarApplyCorrection");
		applyBtn.className = "maquill-result-apply";
		applyBtn.onclick = () => {
			editor.replaceSelection(result.corrected);
			new Notice(`${t("toolbarApplyCorrection")} ✓`);
			cleanup();
		};
		buttonContainer.appendChild(applyBtn);
	}

	// Replace button (only for synonym/antonym with results)
	if (isReplaceable && result.length > 0) {
		// 过滤掉原词后检查是否还有结果
		const hasFilteredResults = result.some(
			(word) => word.toLowerCase() !== original.toLowerCase()
		);

		if (hasFilteredResults) {
			replaceBtn = document.createElement("button");
			replaceBtn.textContent = t("toolbarReplace");
			replaceBtn.className = "maquill-result-apply is-disabled";
			replaceBtn.disabled = true;
			replaceBtn.onclick = () => {
				if (selectedWord) {
					editor.replaceSelection(selectedWord);
					new Notice(
						`${t(
							"toolbarReplace"
						)}: "${original}" → "${selectedWord}"`
					);
					cleanup();
				}
			};
			buttonContainer.appendChild(replaceBtn);
		}
	}

	// Close button
	const closeBtn = document.createElement("button");
	closeBtn.textContent = t("toolbarClose");
	closeBtn.className = "maquill-result-close";
	closeBtn.onclick = cleanup;
	buttonContainer.appendChild(closeBtn);

	content.appendChild(buttonContainer);

	modal.appendChild(content);
	document.body.appendChild(overlay);
	document.body.appendChild(modal);
}
