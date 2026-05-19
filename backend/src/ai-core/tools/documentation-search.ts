import axios from 'axios';

const ALGOLIA_APP_ID = '31P3X3M1EE';
const ALGOLIA_SEARCH_API_KEY = 'fe7422b190b4ec77f8e60c80a3a3ed8a';
const ALGOLIA_INDEX_NAME = 'rocketadmin-docs';
const ALGOLIA_SEARCH_URL = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/query`;

const DEFAULT_HITS_PER_PAGE = 5;
const MAX_HITS_PER_PAGE = 10;
const MAX_CONTENT_LENGTH = 800;
const REQUEST_TIMEOUT_MS = 10000;

export interface DocumentationSearchHit {
	title: string;
	url: string;
	content: string;
}

interface AlgoliaHierarchy {
	lvl0?: string | null;
	lvl1?: string | null;
	lvl2?: string | null;
	lvl3?: string | null;
	lvl4?: string | null;
	lvl5?: string | null;
	lvl6?: string | null;
}

interface AlgoliaHit {
	url?: string;
	content?: string | null;
	hierarchy?: AlgoliaHierarchy;
	type?: string;
}

interface AlgoliaSearchResponse {
	hits: AlgoliaHit[];
}

export async function searchDocumentation(query: string, hitsPerPage?: number): Promise<DocumentationSearchHit[]> {
	const trimmedQuery = query?.trim();
	if (!trimmedQuery) {
		return [];
	}

	const limit = Math.min(Math.max(hitsPerPage ?? DEFAULT_HITS_PER_PAGE, 1), MAX_HITS_PER_PAGE);

	const response = await axios.post<AlgoliaSearchResponse>(
		ALGOLIA_SEARCH_URL,
		{
			query: trimmedQuery,
			hitsPerPage: limit,
			attributesToRetrieve: ['hierarchy', 'content', 'url', 'type'],
			attributesToSnippet: ['content:50'],
		},
		{
			headers: {
				'X-Algolia-Application-Id': ALGOLIA_APP_ID,
				'X-Algolia-API-Key': ALGOLIA_SEARCH_API_KEY,
				'Content-Type': 'application/json',
			},
			timeout: REQUEST_TIMEOUT_MS,
		},
	);

	const hits = response.data?.hits ?? [];
	return hits.map(buildHit).filter((hit) => hit.url && (hit.title || hit.content));
}

function buildHit(hit: AlgoliaHit): DocumentationSearchHit {
	const title = formatHierarchy(hit.hierarchy);
	const rawContent = (hit.content ?? '').replace(/\s+/g, ' ').trim();
	const content = rawContent.length > MAX_CONTENT_LENGTH ? `${rawContent.slice(0, MAX_CONTENT_LENGTH)}…` : rawContent;
	return {
		title,
		url: hit.url ?? '',
		content,
	};
}

function formatHierarchy(hierarchy: AlgoliaHierarchy | undefined): string {
	if (!hierarchy) {
		return '';
	}
	const parts = [
		hierarchy.lvl0,
		hierarchy.lvl1,
		hierarchy.lvl2,
		hierarchy.lvl3,
		hierarchy.lvl4,
		hierarchy.lvl5,
		hierarchy.lvl6,
	]
		.filter((part): part is string => Boolean(part))
		.map((part) => part.replace(/​|‌|‍/g, '').trim())
		.filter(Boolean);
	return parts.join(' › ');
}
