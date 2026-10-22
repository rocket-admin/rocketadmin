// The AI panel's static content: the loading captions, the suggestion chips and their completions,
// and the textarea height for the window height (all from db-table-ai-panel.component.ts).

export interface AiChatMessage {
	type: 'user' | 'ai' | 'ai-error';
	text: string;
	/** Streamed reasoning, shown until the answer text starts. */
	thinking?: string;
}

export interface AiSuggestion {
	title: string;
	prompt: string;
	completions: string[];
}

export interface AiSuggestionCategory {
	title: string;
	suggestions: AiSuggestion[];
}

/** Cycled every 2 s while waiting for the first chunk. */
export const LOADING_STEPS: readonly string[] = [
	'Connecting to database',
	'Analyzing table structure',
	'Scanning records',
	'Processing your query',
	'Searching for patterns',
	'Generating response',
];

export const SUGGESTION_CATEGORIES: readonly AiSuggestionCategory[] = [
	{
		title: 'Explore',
		suggestions: [
			{
				title: 'Show recent records',
				prompt: 'Show recent records',
				completions: [
					'Show recent records - the 10 most recently added',
					'Show recent records - from the last 24 hours',
					'Show recent records - the last entry added',
					'Show recent records - with newest timestamps',
				],
			},
			{
				title: 'Summarize table',
				prompt: 'Summarize table',
				completions: [
					'Summarize table - structure and content overview',
					'Summarize table - what kind of data is stored',
					'Summarize table - purpose of each column',
					'Summarize table - record count and what they represent',
				],
			},
			{
				title: 'Find patterns',
				prompt: 'Find patterns',
				completions: [
					'Find patterns - in this data',
					'Find patterns - correlations between columns',
					'Find patterns - common value combinations',
					'Find patterns - seasonal or cyclical trends',
				],
			},
		],
	},
	{
		title: 'Data Quality',
		suggestions: [
			{
				title: 'Find issues',
				prompt: 'Find issues',
				completions: [
					'Find issues - data quality problems',
					'Find issues - missing or NULL values',
					'Find issues - potential duplicates',
					'Find issues - inconsistent data formats',
				],
			},
			{
				title: 'Check duplicates',
				prompt: 'Check duplicates',
				completions: [
					'Check duplicates - any duplicate records',
					'Check duplicates - rows that look similar',
					'Check duplicates - values appearing multiple times',
					'Check duplicates - records entered twice',
				],
			},
			{
				title: 'Validate data',
				prompt: 'Validate data',
				completions: [
					'Validate data - required fields filled',
					'Validate data - incorrect values',
					'Validate data - records not matching patterns',
					'Validate data - outliers and unusual values',
				],
			},
		],
	},
	{
		title: 'Insights',
		suggestions: [
			{
				title: 'Top values',
				prompt: 'Top values',
				completions: [
					'Top values - most common in each column',
					'Top values - 10 most frequent entries',
					'Top values - categories with most records',
					'Top values - what appears most often',
				],
			},
			{
				title: 'Statistics',
				prompt: 'Statistics',
				completions: [
					'Statistics - for numeric columns',
					'Statistics - min, max, and average',
					'Statistics - distribution of values',
					'Statistics - summary of this data',
				],
			},
			{
				title: 'Anomalies',
				prompt: 'Anomalies',
				completions: [
					'Anomalies - unusual or unexpected values',
					'Anomalies - records that stand out',
					'Anomalies - statistical outliers',
					'Anomalies - what looks different or wrong',
				],
			},
		],
	},
];

/** `adjustTextareaRows()`: fewer rows on short windows. */
export function textareaRowsFor(windowHeight: number): number {
	if (windowHeight < 500) return 1;
	if (windowHeight < 650) return 2;
	if (windowHeight < 800) return 3;
	if (windowHeight < 950) return 4;
	return 5;
}
