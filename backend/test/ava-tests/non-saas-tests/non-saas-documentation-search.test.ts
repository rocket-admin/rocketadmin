import test from 'ava';
import nock from 'nock';
import { searchDocumentation } from '../../../src/ai-core/tools/documentation-search.js';

const ALGOLIA_ORIGIN = 'https://31P3X3M1EE-dsn.algolia.net';
const ALGOLIA_PATH = '/1/indexes/rocketadmin-docs/query';

test.before(() => {
	nock.disableNetConnect();
});

test.after.always(() => {
	nock.cleanAll();
	nock.enableNetConnect();
});

test.afterEach(() => {
	nock.cleanAll();
});

test.serial('returns an empty list when query is blank without calling Algolia', async (t) => {
	const scope = nock(ALGOLIA_ORIGIN).post(ALGOLIA_PATH).reply(200, { hits: [] });

	const blankResults = await searchDocumentation('   ');
	t.deepEqual(blankResults, []);
	t.false(scope.isDone(), 'no HTTP call should have been made for a blank query');
});

test.serial('parses Algolia hits into title/url/content triples', async (t) => {
	nock(ALGOLIA_ORIGIN)
		.post(ALGOLIA_PATH, (body) => body.query === 'master password' && body.hitsPerPage === 5)
		.matchHeader('x-algolia-application-id', '31P3X3M1EE')
		.matchHeader('x-algolia-api-key', 'fe7422b190b4ec77f8e60c80a3a3ed8a')
		.reply(200, {
			hits: [
				{
					url: 'https://docs.rocketadmin.com/Reference/MasterPassword#how-it-works',
					content: 'The master password should be distributed to all users.',
					hierarchy: {
						lvl0: 'Reference',
						lvl1: 'Master password',
						lvl2: null,
						lvl3: 'How it works​',
						lvl4: null,
						lvl5: null,
						lvl6: null,
					},
				},
				{
					url: 'https://docs.rocketadmin.com/Reference/permissions',
					content: '   Permissions control which   users see which tables.   ',
					hierarchy: { lvl0: 'Reference', lvl1: 'Permissions' },
				},
			],
		});

	const results = await searchDocumentation('master password');

	t.is(results.length, 2);
	t.is(results[0].url, 'https://docs.rocketadmin.com/Reference/MasterPassword#how-it-works');
	t.is(results[0].title, 'Reference › Master password › How it works');
	t.is(results[0].content, 'The master password should be distributed to all users.');
	t.is(results[1].title, 'Reference › Permissions');
	t.is(results[1].content, 'Permissions control which users see which tables.');
});

test.serial('truncates very long content snippets', async (t) => {
	const longContent = 'x'.repeat(2000);
	nock(ALGOLIA_ORIGIN)
		.post(ALGOLIA_PATH)
		.reply(200, {
			hits: [
				{
					url: 'https://docs.rocketadmin.com/quickstart',
					content: longContent,
					hierarchy: { lvl0: 'Quickstart' },
				},
			],
		});

	const [hit] = await searchDocumentation('quickstart');
	t.true(hit.content.length <= 801);
	t.true(hit.content.endsWith('…'));
});

test.serial('clamps hitsPerPage to the allowed range', async (t) => {
	let receivedHitsPerPage: number | undefined;
	nock(ALGOLIA_ORIGIN)
		.post(ALGOLIA_PATH, (body) => {
			receivedHitsPerPage = body.hitsPerPage;
			return true;
		})
		.reply(200, { hits: [] });

	await searchDocumentation('anything', 999);
	t.is(receivedHitsPerPage, 10);
});

test.serial('drops hits that have no url or content', async (t) => {
	nock(ALGOLIA_ORIGIN)
		.post(ALGOLIA_PATH)
		.reply(200, {
			hits: [
				{ url: '', content: 'no url so should drop', hierarchy: { lvl0: 'X' } },
				{ url: 'https://docs.rocketadmin.com/x', content: '', hierarchy: {} },
				{ url: 'https://docs.rocketadmin.com/keep', content: 'kept', hierarchy: { lvl0: 'Keep' } },
			],
		});

	const results = await searchDocumentation('mixed');
	t.is(results.length, 1);
	t.is(results[0].url, 'https://docs.rocketadmin.com/keep');
});
