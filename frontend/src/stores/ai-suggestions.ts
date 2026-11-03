// Port of AISuggestionsService's state: the suggestion history (a BehaviorSubject in Angular). The
// context builders and local suggestion generator are pure and live in lib/ai-suggestions.ts.
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { buildSuggestionInput as buildInput } from '@/lib/ai-suggestions';
import type {
	AISuggestionConversation,
	AISuggestionHistory,
	AISuggestionInput,
	AISuggestionTableContext,
	AISuggestionUIContext,
} from '@/models/ai-suggestions';

export const useAiSuggestionsStore = defineStore('aiSuggestions', () => {
	const history = ref<AISuggestionHistory>(emptyHistory());

	/** Build full suggestion input, with the current history attached. */
	function buildSuggestionInput(
		tableContext: AISuggestionTableContext,
		uiContext?: AISuggestionUIContext,
		conversationContext?: AISuggestionConversation,
	): AISuggestionInput {
		return buildInput(history.value, tableContext, uiContext, conversationContext);
	}

	/** Record that a suggestion was clicked (the last 10 are kept). */
	function recordSuggestionClick(suggestionId: string): void {
		const clicked = [...(history.value.recently_clicked_ids || []), suggestionId].slice(-10);
		history.value = { ...history.value, recently_clicked_ids: clicked };
	}

	/** Record suggestions that were shown (the last 20 are kept). Private and unused in Angular. */
	function recordShownSuggestions(shownIds: string[]): void {
		const shown = [...(history.value.recently_shown_ids || []), ...shownIds].slice(-20);
		history.value = { ...history.value, recently_shown_ids: shown };
	}

	function clearHistory(): void {
		history.value = emptyHistory();
	}

	return { history, buildSuggestionInput, recordSuggestionClick, recordShownSuggestions, clearHistory };
});

function emptyHistory(): AISuggestionHistory {
	return { recently_shown_ids: [], recently_clicked_ids: [] };
}
