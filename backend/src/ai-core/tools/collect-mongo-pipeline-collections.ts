import { CollectQueryTablesResult } from '../../entities/visualizations/panel/utils/collect-query-tables.util.js';
import { getErrorMessage } from '../../helpers/get-error-message.js';

/**
 * Recursively collects collection names referenced by stages that read from
 * other collections (`$lookup`, `$graphLookup`, `$unionWith`) anywhere in a
 * MongoDB aggregation pipeline, including nested sub-pipelines.
 */
function collectReferencedCollections(node: unknown, collected: Set<string>): void {
	if (Array.isArray(node)) {
		for (const item of node) {
			collectReferencedCollections(item, collected);
		}
		return;
	}
	if (!node || typeof node !== 'object') {
		return;
	}
	for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
		if (key === '$lookup' || key === '$graphLookup') {
			const from = (value as { from?: unknown })?.from;
			if (typeof from === 'string' && from.length > 0) {
				collected.add(from);
			}
		} else if (key === '$unionWith') {
			// `$unionWith` accepts either a collection-name string or `{ coll: <name>, pipeline: [...] }`.
			if (typeof value === 'string' && value.length > 0) {
				collected.add(value);
			} else {
				const coll = (value as { coll?: unknown })?.coll;
				if (typeof coll === 'string' && coll.length > 0) {
					collected.add(coll);
				}
			}
		}
		collectReferencedCollections(value, collected);
	}
}

/**
 * Resolves the collections a MongoDB aggregation pipeline reads from besides
 * its base collection (the `$lookup` / `$graphLookup` / `$unionWith` targets),
 * so the caller can verify the user has read permission on each.
 *
 * Returns `{ kind: 'tables' }` (possibly empty) when the pipeline parses, and
 * `{ kind: 'indeterminate' }` when it cannot be parsed — in which case the
 * caller must fall back to a stricter check rather than assume it is harmless.
 */
export function collectMongoPipelineCollections(pipeline: string): CollectQueryTablesResult {
	let parsedPipeline: unknown;
	try {
		parsedPipeline = JSON.parse(pipeline);
	} catch (error) {
		return { kind: 'indeterminate', reason: `pipeline parse error: ${getErrorMessage(error)}` };
	}
	const collected = new Set<string>();
	collectReferencedCollections(parsedPipeline, collected);
	return { kind: 'tables', tables: Array.from(collected) };
}
