import test from 'ava';
import { isReadOnlyMongoAggregationPipeline } from '../../../src/ai-core/tools/query-validators.js';

test('allows a plain read-only pipeline', (t) => {
	t.true(isReadOnlyMongoAggregationPipeline('[{"$match":{"status":"active"}},{"$group":{"_id":"$type"}}]'));
});

test('allows a $lookup read pipeline', (t) => {
	t.true(
		isReadOnlyMongoAggregationPipeline(
			'[{"$lookup":{"from":"orders","localField":"id","foreignField":"user_id","as":"o"}},{"$unwind":"$o"}]',
		),
	);
});

test('rejects $out (collection overwrite)', (t) => {
	t.false(isReadOnlyMongoAggregationPipeline('[{"$match":{}},{"$limit":0},{"$out":"users"}]'));
});

test('rejects $merge (collection write)', (t) => {
	t.false(isReadOnlyMongoAggregationPipeline('[{"$merge":{"into":"users","whenMatched":"replace"}}]'));
});

test('rejects $where (server-side JS)', (t) => {
	t.false(isReadOnlyMongoAggregationPipeline('[{"$match":{"$where":"sleep(10000) || true"}}]'));
});

test('rejects $function (server-side JS)', (t) => {
	t.false(
		isReadOnlyMongoAggregationPipeline(
			'[{"$addFields":{"x":{"$function":{"body":"function(){return 1;}","args":[],"lang":"js"}}}}]',
		),
	);
});

test('rejects $accumulator (server-side JS)', (t) => {
	t.false(
		isReadOnlyMongoAggregationPipeline(
			'[{"$group":{"_id":"$k","v":{"$accumulator":{"init":"function(){return 0}","accumulate":"function(){}","accumulateArgs":[],"merge":"function(){}","lang":"js"}}}}]',
		),
	);
});

test('rejects a write stage nested inside a $lookup sub-pipeline', (t) => {
	t.false(
		isReadOnlyMongoAggregationPipeline('[{"$lookup":{"from":"orders","as":"o","pipeline":[{"$out":"stolen"}]}}]'),
	);
});

test('returns false (fail-closed) for an unparseable pipeline', (t) => {
	t.false(isReadOnlyMongoAggregationPipeline('not valid json {'));
});
