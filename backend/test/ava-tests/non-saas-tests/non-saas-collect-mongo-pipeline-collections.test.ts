import test from 'ava';
import { collectMongoPipelineCollections } from '../../../src/ai-core/tools/collect-mongo-pipeline-collections.js';

function tablesOf(pipeline: string): Array<string> {
	const result = collectMongoPipelineCollections(pipeline);
	if (result.kind !== 'tables') {
		throw new Error(`expected resolved tables, got indeterminate: ${result.reason}`);
	}
	return [...result.tables].sort();
}

test('resolves no referenced collections for a pipeline without joins', (t) => {
	t.deepEqual(tablesOf('[{"$match":{"status":"active"}},{"$group":{"_id":"$type"}}]'), []);
});

test('resolves a $lookup target collection', (t) => {
	t.deepEqual(tablesOf('[{"$lookup":{"from":"salaries","localField":"id","foreignField":"user_id","as":"s"}}]'), [
		'salaries',
	]);
});

test('resolves a $graphLookup target collection', (t) => {
	t.deepEqual(
		tablesOf(
			'[{"$graphLookup":{"from":"org_chart","startWith":"$managerId","connectFromField":"managerId","connectToField":"_id","as":"chain"}}]',
		),
		['org_chart'],
	);
});

test('resolves a $unionWith string collection', (t) => {
	t.deepEqual(tablesOf('[{"$unionWith":"archived_orders"}]'), ['archived_orders']);
});

test('resolves a $unionWith object collection', (t) => {
	t.deepEqual(tablesOf('[{"$unionWith":{"coll":"audit_log","pipeline":[]}}]'), ['audit_log']);
});

test('resolves collections nested inside a $lookup sub-pipeline', (t) => {
	const pipeline =
		'[{"$lookup":{"from":"orders","as":"o","pipeline":[{"$lookup":{"from":"secret_payouts","localField":"a","foreignField":"b","as":"p"}}]}}]';
	t.deepEqual(tablesOf(pipeline), ['orders', 'secret_payouts']);
});

test('deduplicates repeated collection references', (t) => {
	const pipeline =
		'[{"$lookup":{"from":"orders","localField":"a","foreignField":"b","as":"o1"}},{"$lookup":{"from":"orders","localField":"c","foreignField":"d","as":"o2"}}]';
	t.deepEqual(tablesOf(pipeline), ['orders']);
});

test('returns indeterminate for an unparseable pipeline', (t) => {
	const result = collectMongoPipelineCollections('not valid json {');
	t.is(result.kind, 'indeterminate');
	if (result.kind === 'indeterminate') {
		t.true(result.reason.includes('parse error'));
	}
});
