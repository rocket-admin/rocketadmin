import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAiSuggestionsStore } from './ai-suggestions';

describe('ai suggestions store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('starts with an empty history and attaches it to the suggestion input', () => {
		const store = useAiSuggestionsStore();
		const table = { name: 't', columns: [], relations: [] };
		expect(store.buildSuggestionInput(table).suggestion_history).toEqual({
			recently_shown_ids: [],
			recently_clicked_ids: [],
		});
	});

	it('keeps the last 10 clicked ids', () => {
		const store = useAiSuggestionsStore();
		for (let i = 0; i < 12; i++) store.recordSuggestionClick(`s${i}`);
		expect(store.history.recently_clicked_ids).toEqual(['s2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11']);
	});

	it('keeps the last 20 shown ids', () => {
		const store = useAiSuggestionsStore();
		store.recordShownSuggestions(Array.from({ length: 25 }, (_, i) => `s${i}`));
		expect(store.history.recently_shown_ids).toHaveLength(20);
		expect(store.history.recently_shown_ids?.[0]).toBe('s5');
	});

	it('clearHistory resets both lists', () => {
		const store = useAiSuggestionsStore();
		store.recordSuggestionClick('a');
		store.recordShownSuggestions(['b']);
		store.clearHistory();
		expect(store.history).toEqual({ recently_shown_ids: [], recently_clicked_ids: [] });
	});
});
