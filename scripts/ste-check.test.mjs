// Tests for scripts/ste-check.mjs. Run with: node --test scripts/
// Each test gives the checker a small text and asserts the rules it reports.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	checkFileText,
	checkSegment,
	classifyPath,
	countWords,
	extractComments,
	extractMarkdownSegments,
	hookTextFromInput,
	inRanges,
	parseAddedRanges,
	pathWithin,
	splitSentences,
} from './ste-check.mjs';

const rulesOf = (findings) => findings.map((f) => f.rule).sort();
const check = (text, options) => checkSegment({ line: 1, text }, options);

test('a compliant paragraph has no findings', () => {
	const text =
		'The router injects one script tag into each HTML page. The tag has no site-specific value. ' +
		'The browser sends the Origin header, and the service finds the site from it.';
	assert.deepEqual(check(text), []);
});

test('sentence-length: a sentence over the limit is an error with the word count', () => {
	const words = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ');
	const [f] = check(`${words}.`);
	assert.equal(f.rule, 'sentence-length');
	assert.equal(f.level, 'error');
	assert.match(f.message, /^30 words, the limit is 25/);
	assert.deepEqual(check(`${words}.`, { maxWords: 30 }), []);
});

test('countWords: hyphenated words, paths and code spans count as one word', () => {
	assert.equal(countWords('read-only access to src/app.ts and CODE'), 6);
	assert.equal(countWords('— → ...'), 0);
});

test('banned-word: phrases and words report the approved alternative', () => {
	const findings = check('Restart the service in order to ensure the cache is empty via the CLI.');
	const banned = findings.filter((f) => f.rule === 'banned-word');
	assert.deepEqual(
		banned.map((f) => f.message),
		[
			'"in order to" is not an approved word. Write "to".',
			'"ensure" is not an approved word. Write "make sure".',
			'"via" is not an approved word. Write "through, or with".',
		],
	);
	assert.deepEqual(check('The performance of the viaduct is fine.'), []);
});

test('contraction: contractions are errors', () => {
	const [f] = check("Don't call the API twice.");
	assert.equal(f.rule, 'contraction');
	assert.equal(f.message, '"don\'t" is a contraction. Write "do not".');
	const [g] = check('It’s a curly apostrophe.');
	assert.equal(g.rule, 'contraction');
});

test('dash-clause: an em dash or a spaced en dash is an error, a numeric range is not', () => {
	assert.deepEqual(rulesOf(check('The task runs once — then it exits.')), ['dash-clause']);
	assert.deepEqual(rulesOf(check('The task runs once – then it exits.')), ['dash-clause']);
	assert.deepEqual(rulesOf(check('The task runs once -- then it exits.')), ['dash-clause']);
	assert.deepEqual(check('Pages 3–5 cover the setup.'), []);
	assert.deepEqual(check('Use the read-only key.'), []);
});

test('passive-voice: be + participle is a warning, adjectives and unX-ed words are not', () => {
	const [f] = check('The tag is injected by the router.');
	assert.equal(f.rule, 'passive-voice');
	assert.equal(f.level, 'warning');
	assert.match(f.message, /"is injected" is passive/);
	assert.deepEqual(check('The core is untouched. The database is related to the site.'), []);
	assert.deepEqual(check('The connected database has one table.'), []);
	assert.deepEqual(rulesOf(check('The row was also deleted.')), ['passive-voice']);
	assert.deepEqual(rulesOf(check('Files are read by the agent.')), ['passive-voice']);
});

test('perfect-tense: has/have/had + participle is a warning', () => {
	assert.deepEqual(rulesOf(check('The build has been slow.')), ['perfect-tense']);
	assert.deepEqual(rulesOf(check('We have changed the key.')), ['perfect-tense']);
	assert.deepEqual(check('The service has one feed. The user had to wait.'), []);
});

test('gerund: an -ing verb after a trigger word or at the start is a warning', () => {
	const [f] = check('Stop the service before running the migration.');
	assert.equal(f.rule, 'gerund');
	assert.match(f.message, /"before running" uses an -ing verb form/);
	assert.deepEqual(rulesOf(check('Purging the rows is an operator step.')), ['gerund']);
	assert.deepEqual(check('During the build, the following settings apply to logging.'), []);
	assert.deepEqual(check('The pending row keeps the existing value.'), []);
});

test('parenthesis: six or more words in parentheses is a warning', () => {
	const [f] = check('The service stores the row (the saas ignores ids it already stored) once.');
	assert.equal(f.rule, 'parenthesis');
	assert.match(f.message, /^7 words in parentheses/);
	assert.deepEqual(check('The cap is 10 sites (plan 46).'), []);
});

test('ellipsis: three dots or the ellipsis character is a warning', () => {
	assert.deepEqual(rulesOf(check('The job has three states (queued, running, …).')), ['ellipsis']);
	assert.deepEqual(rulesOf(check('Retry later...')), ['ellipsis']);
});

test('paragraph-length: more than six sentences in one paragraph is a warning', () => {
	const text = Array.from({ length: 7 }, (_, i) => `Sentence number ${i} is short.`).join(' ');
	assert.deepEqual(rulesOf(check(text)), ['paragraph-length']);
});

test('splitSentences: abbreviations, decimals, versions and initials do not end a sentence', () => {
	const s = splitSentences('Version 2.5 ships Dr. Who. See fig. 3 for the flow. Done!');
	assert.deepEqual(
		s.map((x) => x.text),
		['Version 2.5 ships Dr. Who.', 'See fig. 3 for the flow.', 'Done!'],
	);
	const t = splitSentences('Read `a.ts` first.\nThen run it.');
	assert.equal(t.length, 2);
});

test('markdown: code blocks, headings and HTML comments are not prose, inline code is one word', () => {
	const md = [
		'# A heading that is quite long and has more than twenty five words in it, which is fine for a heading because headings are titles',
		'',
		'```ts',
		'const x = 1; // this comment inside a fence is code and must never be checked by the prose rules at all, however long',
		'```',
		'',
		'<!-- a hidden note with more than twenty five words in it that is not prose and should never ever be counted by the checker -->',
		'',
		'Run `pnpm build && pnpm test` first.',
		'',
		'> **Status:** done.',
		'> The quote continues here.',
	].join('\n');
	const segments = extractMarkdownSegments(md);
	assert.deepEqual(
		segments.map((s) => [s.line, s.text]),
		[
			[9, 'Run `pnpm build && pnpm test` first.'],
			[11, '**Status:** done.\nThe quote continues here.'],
		],
	);
	assert.deepEqual(checkFileText('plans/x.md', md), []);
});

test('markdown: table cells and list items are separate paragraphs with their own lines', () => {
	const md = [
		'| A | B |',
		'| --- | --- |',
		'| First cell. | Second cell via the API. |',
		'',
		'- item one',
		'  continues here.',
		'- item two',
		'1. step one',
	].join('\n');
	const segments = extractMarkdownSegments(md);
	assert.deepEqual(
		segments.map((s) => [s.line, s.text]),
		[
			[1, 'A'],
			[1, 'B'],
			[3, 'First cell.'],
			[3, 'Second cell via the API.'],
			[5, 'item one\ncontinues here.'],
			[7, 'item two'],
			[8, 'step one'],
		],
	);
	const findings = checkFileText('plans/x.md', md);
	assert.deepEqual(
		findings.map((f) => [f.line, f.rule]),
		[[3, 'banned-word']],
	);
});

test('markdown: a finding in a wrapped paragraph points at its own line', () => {
	const md = ['Line one is fine.', 'Line two says via the API.', 'Line three is fine.'].join('\n');
	const [f] = checkFileText('architecture-design-records/x.md', md);
	assert.equal(f.line, 2);
	assert.equal(f.rule, 'banned-word');
});

test('comments: consecutive // lines form one paragraph, an empty // line splits paragraphs', () => {
	const src = [
		'// First paragraph line one.',
		'// First paragraph line two.',
		'//',
		'// Second paragraph.',
		'const a = 1;',
		'// Third, after code.',
	].join('\n');
	const segments = extractComments(src, '.ts');
	assert.deepEqual(
		segments.map((s) => [s.line, s.text]),
		[
			[1, 'First paragraph line one.\nFirst paragraph line two.'],
			[4, 'Second paragraph.'],
			[6, 'Third, after code.'],
		],
	);
});

test('comments: strings, template literals and regex literals are not comments', () => {
	const src = [
		"const url = 'https://example.com/a'; // real comment via the URL",
		'const tpl = `line one',
		'// not a comment, inside the template',
		'/* also not a comment */',
		'`;',
		'const re = /https?:\\/\\//; // trailing comment',
		'const html = "<!-- not a comment -->";',
	].join('\n');
	const segments = extractComments(src, '.ts');
	assert.deepEqual(
		segments.map((s) => s.text),
		['real comment via the URL', 'trailing comment'],
	);
});

test('comments: block comments lose the stars and the JSDoc tags, paragraphs split on blank lines', () => {
	const src = [
		'/**',
		' * Opens the session.',
		' *',
		' * @param {string} id the session id via the header',
		' * @returns the open session',
		' */',
		'function open(id) {}',
	].join('\n');
	const segments = extractComments(src, '.ts');
	assert.deepEqual(
		segments.map((s) => [s.line, s.text]),
		[
			[2, 'Opens the session.'],
			[4, 'the session id via the header\nthe open session'],
		],
	);
});

test('comments: directives, commented-out code and HTML comments in Vue are handled', () => {
	const src = [
		'// biome-ignore lint/suspicious/noExplicitAny: legacy',
		'// eslint-disable-next-line',
		'// const old = compute(a, b);',
		'// return old;',
		'<!-- The template comment via the markup. -->',
		'/* @__PURE__ */',
	].join('\n');
	const segments = extractComments(src, '.vue');
	assert.deepEqual(
		segments.map((s) => s.text),
		['The template comment via the markup.'],
	);
});

test('comments: # comments in shell and YAML files, quotes and the shebang are respected', () => {
	const src = [
		'#!/bin/sh',
		'# Lint the staged files via Biome.',
		'echo "# not a comment" # trailing comment',
		"KEY='a#b'",
	].join('\n');
	const segments = extractComments(src, '.sh');
	assert.deepEqual(
		segments.map((s) => [s.line, s.text]),
		[
			[2, 'Lint the staged files via Biome.'],
			[3, 'trailing comment'],
		],
	);
	assert.deepEqual(rulesOf(checkFileText('.github/workflows/ci.yml', '# Checks run via CI.')), ['banned-word']);
});

test('classifyPath: document directories, other Markdown, code and everything else', () => {
	assert.equal(classifyPath('plans/82-x.md'), 'doc');
	assert.equal(classifyPath('architecture-design-records/README.md'), 'doc');
	assert.equal(classifyPath('sitenova/plans/82-x.md'), 'doc');
	assert.equal(classifyPath('README.md'), 'markdown');
	assert.equal(classifyPath('src/app.ts'), 'code');
	assert.equal(classifyPath('frontend/src/App.vue'), 'code');
	assert.equal(classifyPath('package.json'), null);
	assert.equal(classifyPath('docs/x.md', { docDirs: ['docs'] }), 'doc');
});

test('parseAddedRanges + inRanges: only added lines count', () => {
	const diff = [
		'diff --git a/plans/x.md b/plans/x.md',
		'--- a/plans/x.md',
		'+++ b/plans/x.md',
		'@@ -1,0 +2,3 @@',
		'+a',
		'+b',
		'+c',
		'@@ -10 +13 @@',
		'+d',
		'diff --git a/gone.md b/gone.md',
		'--- a/gone.md',
		'+++ /dev/null',
		'@@ -1,3 +0,0 @@',
	].join('\n');
	const ranges = parseAddedRanges(diff);
	assert.deepEqual(ranges, {
		'plans/x.md': [
			[2, 4],
			[13, 13],
		],
	});
	assert.equal(inRanges({ line: 3 }, ranges['plans/x.md']), true);
	assert.equal(inRanges({ line: 1, endLine: 2 }, ranges['plans/x.md']), true);
	assert.equal(inRanges({ line: 5, endLine: 12 }, ranges['plans/x.md']), false);
});

test('hookTextFromInput: Write content, Edit new_string and multi-edit arrays', () => {
	assert.deepEqual(hookTextFromInput({ tool_input: { file_path: 'a.md', content: 'x' } }), {
		filePath: 'a.md',
		text: 'x',
	});
	assert.deepEqual(hookTextFromInput({ tool_input: { file_path: 'a.md', old_string: 'o', new_string: 'n' } }), {
		filePath: 'a.md',
		text: 'n',
	});
	assert.deepEqual(
		hookTextFromInput({
			tool_input: { file_path: 'a.md', edits: [{ new_string: 'p' }, { new_string: 'q' }] },
		}),
		{ filePath: 'a.md', text: 'p\n\nq' },
	);
	assert.equal(hookTextFromInput({ tool_input: { command: 'ls' } }), null);
	assert.equal(hookTextFromInput(null), null);
});

test('pathWithin: no restriction, a directory prefix, and a sibling with the same prefix string', () => {
	assert.equal(pathWithin('/a/b/c.md', null), true);
	assert.equal(pathWithin('/a/b/c.md', ['/a/b']), true);
	assert.equal(pathWithin('/a/b/c.md', ['/x', '/a']), true);
	assert.equal(pathWithin('/a/bb/c.md', ['/a/b']), false);
});
