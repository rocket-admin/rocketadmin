#!/usr/bin/env node
// ste-check: a checker for the ASD-STE100 writing rules of this project. It reads Markdown
// documents and the comments in source files. It reports sentences that break the rules.
// It has no dependencies. The rules and the reasons are in
// architecture-design-records/STE100-WRITING-RULES.md (sitenova repo).
//
// Usage:
//   node scripts/ste-check.mjs [paths...]        check these files or directories
//   node scripts/ste-check.mjs --changed <ref>   check only the lines that a diff against <ref> adds
//   node scripts/ste-check.mjs --staged          check only the staged lines
//   node scripts/ste-check.mjs --hook            Claude Code PostToolUse mode (JSON on stdin)
//   node scripts/ste-check.mjs --summary         print the count of findings per rule
// Options:
//   --strict               exit 1 when one or more findings have the "error" level
//   --format human|github|json
//   --docs                 Markdown under the document directories only
//   --code                 comments in source files only
//   --max-words <n>        words per sentence (default 25)
//   --only <dir,dir>       hook mode: check files under these directories only
//
// Three repositories keep an identical copy of this file. The copy in
// sitenova/scripts/ste-check.mjs is the source. Change it there first, then copy it.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------------------------

export const DEFAULT_MAX_WORDS = 25;
export const MAX_SENTENCES_PER_PARAGRAPH = 6;
export const MAX_WORDS_IN_PARENTHESES = 5;
export const DOC_DIRS = ['plans', 'architecture-design-records'];

const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);
const JS_LIKE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.css', '.scss']);
const HTML_EXTENSIONS = new Set(['.html']);
const HASH_EXTENSIONS = new Set(['.sh', '.yml', '.yaml', '.py', '.toml']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', 'build', 'results']);

// Words and phrases that ASD-STE100 does not approve, with the approved alternative.
// Longer phrases come first so that they win over the single words they contain.
const BANNED = [
	['due to the fact that', 'because'],
	['at this point in time', 'now'],
	['in the event that', 'if'],
	['with regard to', 'about'],
	['with respect to', 'about'],
	['the majority of', 'most of'],
	['on the other hand', 'but'],
	['in order to', 'to'],
	['subsequent to', 'after'],
	['prior to', 'before'],
	['in case of', 'if'],
	['as well as', 'and'],
	['a number of', 'some, or give the number'],
	['in terms of', 'for, or rewrite the sentence'],
	['e.g.', 'for example'],
	['i.e.', 'that is'],
	['etc.', 'the full list, or "and other <items>"'],
	['vs.', 'compared with, or "or"'],
	['versus', 'compared with, or "or"'],
	['cf.', 'compare with'],
	['utilize', 'use'],
	['utilise', 'use'],
	['utilization', 'use'],
	['ensure', 'make sure'],
	['ensures', 'makes sure'],
	['perform', 'do'],
	['performs', 'does'],
	['performed', 'did'],
	['commence', 'start'],
	['commences', 'starts'],
	['terminate', 'stop'],
	['terminates', 'stops'],
	['terminated', 'stopped'],
	['subsequently', 'then'],
	['via', 'through, or with'],
	['regarding', 'about'],
	['leverage', 'use'],
	['leverages', 'uses'],
	['leveraged', 'used'],
	['facilitate', 'help, or make possible'],
	['facilitates', 'helps'],
	['whilst', 'while'],
	['amongst', 'among'],
	['upon', 'on'],
	['additionally', 'also'],
	['furthermore', 'also'],
	['moreover', 'also'],
	['nevertheless', 'but'],
	['however', 'but'],
	['hence', 'so'],
	['obtain', 'get'],
	['obtains', 'gets'],
	['obtained', 'got'],
	['assist', 'help'],
	['assists', 'helps'],
	['attempted', 'tried'],
	['numerous', 'many'],
	['demonstrate', 'show'],
	['demonstrates', 'shows'],
	['initiate', 'start'],
	['initiates', 'starts'],
	['accomplish', 'do'],
	['shall', 'must'],
];

// Contractions. STE uses the full form.
const CONTRACTIONS = [
	["don't", 'do not'],
	["doesn't", 'does not'],
	["didn't", 'did not'],
	["can't", 'cannot'],
	["won't", 'will not'],
	["isn't", 'is not'],
	["aren't", 'are not'],
	["wasn't", 'was not'],
	["weren't", 'were not'],
	["it's", 'it is'],
	["that's", 'that is'],
	["there's", 'there is'],
	["here's", 'here is'],
	["what's", 'what is'],
	["we're", 'we are'],
	["you're", 'you are'],
	["they're", 'they are'],
	["i'm", 'I am'],
	["let's", 'rewrite as an instruction'],
	["shouldn't", 'should not'],
	["couldn't", 'could not'],
	["wouldn't", 'would not'],
	["haven't", 'have not'],
	["hasn't", 'has not'],
	["hadn't", 'had not'],
	["we've", 'we have'],
	["you've", 'you have'],
	["they've", 'they have'],
	["we'll", 'we will'],
	["you'll", 'you will'],
	["it'll", 'it will'],
	["who's", 'who is'],
];

// Past participles that do not end in -ed. Used by the passive-voice and perfect-tense checks.
const IRREGULAR_PARTICIPLES = new Set([
	'begun',
	'bitten',
	'blown',
	'bound',
	'broken',
	'brought',
	'built',
	'bought',
	'caught',
	'chosen',
	'come',
	'cut',
	'dealt',
	'done',
	'drawn',
	'driven',
	'eaten',
	'fallen',
	'fed',
	'felt',
	'fought',
	'forbidden',
	'forgotten',
	'frozen',
	'given',
	'gone',
	'got',
	'gotten',
	'grown',
	'heard',
	'held',
	'hidden',
	'hit',
	'hung',
	'hurt',
	'kept',
	'known',
	'laid',
	'led',
	'left',
	'lent',
	'let',
	'lit',
	'lost',
	'made',
	'meant',
	'met',
	'mistaken',
	'overridden',
	'overwritten',
	'paid',
	'proven',
	'put',
	'read',
	'rebuilt',
	'redone',
	'reset',
	'resent',
	'rewritten',
	'ridden',
	'risen',
	'run',
	'rung',
	'said',
	'sat',
	'seen',
	'sent',
	'set',
	'shaken',
	'shown',
	'shut',
	'slept',
	'sold',
	'spent',
	'split',
	'spoken',
	'spread',
	'stolen',
	'stood',
	'struck',
	'stuck',
	'swept',
	'taken',
	'thought',
	'thrown',
	'told',
	'torn',
	'understood',
	'undone',
	'upheld',
	'withdrawn',
	'woken',
	'won',
	'worn',
	'wound',
	'written',
]);

// Words that end in -ed and are not past participles.
const NOT_PARTICIPLES = new Set([
	'need',
	'speed',
	'feed',
	'seed',
	'bed',
	'red',
	'shed',
	'indeed',
	'proceed',
	'succeed',
	'exceed',
	'embed',
	'hundred',
	'sacred',
	'naked',
	'wicked',
	'hatred',
	'kindred',
	'infrared',
	'based',
	'related',
	'supposed',
	'interested',
	'concerned',
	'tired',
	'detailed',
	'advanced',
]);

// Words that end in -ing and are nouns, adjectives or prepositions in this project's prose.
// The gerund check does not report them.
const ING_ALLOWED = new Set([
	'thing',
	'something',
	'nothing',
	'anything',
	'everything',
	'string',
	'strings',
	'during',
	'morning',
	'evening',
	'ring',
	'king',
	'spring',
	'sibling',
	'siblings',
	'ceiling',
	'setting',
	'settings',
	'building',
	'buildings',
	'billing',
	'logging',
	'routing',
	'caching',
	'throttling',
	'hosting',
	'polling',
	'streaming',
	'rendering',
	'onboarding',
	'pending',
	'existing',
	'following',
	'missing',
	'remaining',
	'incoming',
	'outgoing',
	'including',
	'according',
	'underlying',
	'encoding',
	'encodings',
	'padding',
	'heading',
	'headings',
	'binding',
	'bindings',
	'mapping',
	'mappings',
	'warning',
	'warnings',
	'meaning',
	'timing',
	'timings',
	'ordering',
	'naming',
	'spelling',
	'wording',
	'pricing',
	'staging',
	'tooling',
	'testing',
	'training',
	'landing',
	'willing',
	'interesting',
	'outstanding',
	'upcoming',
	'ongoing',
	'leading',
	'trailing',
	'matching',
	'corresponding',
	'resulting',
	'working',
	'handling',
	'listing',
	'listings',
	'thing',
	'offering',
	'opening',
	'closing',
	'ending',
	'beginning',
	'meeting',
	'reading',
	'writing',
	'nesting',
	'housekeeping',
	'bookkeeping',
	'sterling',
	'wing',
	'swing',
	'anything',
	'sling',
	'shipping',
	'funding',
	'marketing',
	'messaging',
	'signing',
	'clothing',
	'everything',
	'nothing',
	'engineering',
]);

// A word before an -ing form that marks the -ing form as a gerund in most sentences.
const GERUND_TRIGGERS = [
	'by',
	'for',
	'before',
	'after',
	'when',
	'while',
	'without',
	'instead of',
	'on',
	'upon',
	'of',
	'from',
	'in',
	'start',
	'starts',
	'started',
	'stop',
	'stops',
	'stopped',
	'keep',
	'keeps',
	'kept',
	'avoid',
	'avoids',
	'avoided',
	'means',
	'involve',
	'involves',
	'include',
	'includes',
	'require',
	'requires',
	'allow',
	'allows',
	'enable',
	'enables',
	'support',
	'supports',
	'consider',
	'considers',
	'worth',
	'than',
];

// Comments that are directives for tools, not prose.
const DIRECTIVE_PREFIXES = [
	'biome-ignore',
	'eslint',
	'prettier',
	'@ts-',
	'istanbul',
	'c8 ',
	'v8 ',
	'#region',
	'#endregion',
	'noinspection',
	'tslint',
	'@vue-ignore',
	'sourcemappingurl',
	'@__pure__',
	'@license',
	'spdx-',
	'copyright',
	'@jest',
	'vitest-',
	'node:coverage',
	'oxlint',
];

const ABBREVIATIONS_BEFORE_PERIOD = new Set([
	'e.g',
	'i.e',
	'etc',
	'vs',
	'cf',
	'no',
	'fig',
	'approx',
	'incl',
	'min',
	'max',
	'sec',
	'ms',
	'st',
	'nd',
	'rd',
	'th',
	'mr',
	'mrs',
	'dr',
	'inc',
	'ltd',
	'co',
	'ca',
	'p',
	'pp',
	'ch',
	'sec',
	'rev',
	'ver',
	'vol',
	'ed',
	'al',
	'cont',
	'dept',
	'est',
	'resp',
]);

export const RULES = {
	'sentence-length': { level: 'error' },
	'banned-word': { level: 'error' },
	contraction: { level: 'error' },
	'dash-clause': { level: 'error' },
	'paragraph-length': { level: 'warning' },
	parenthesis: { level: 'warning' },
	'passive-voice': { level: 'warning' },
	'perfect-tense': { level: 'warning' },
	gerund: { level: 'warning' },
	ellipsis: { level: 'warning' },
};

// ---------------------------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------------------------

const WORD_RE = /[\p{L}\p{N}]/u;

export function countWords(text) {
	let count = 0;
	for (const token of text.split(/\s+/)) {
		if (WORD_RE.test(token)) count += 1;
	}
	return count;
}

function escapeRegex(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const bannedMatchers = BANNED.map(([phrase, suggestion]) => ({
	phrase,
	suggestion,
	re: new RegExp(`(?<![\\p{L}\\p{N}_-])${escapeRegex(phrase)}(?![\\p{L}\\p{N}_-])`, 'giu'),
}));

const contractionMatchers = CONTRACTIONS.map(([phrase, suggestion]) => ({
	phrase,
	suggestion,
	re: new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegex(phrase).replace("'", "['’]")}(?![\\p{L}\\p{N}_])`, 'giu'),
}));

const gerundTriggerRe = new RegExp(
	`(?:^|[^\\p{L}\\p{N}_-])(${GERUND_TRIGGERS.map(escapeRegex).join('|')})\\s+([\\p{L}]+ing)(?![\\p{L}\\p{N}_-])`,
	'giu',
);

const ADVERBS =
	'(?:not|also|then|still|never|already|only|usually|always|often|now|first|later|again|just|since|\\p{L}+ly)';
const passiveRe = new RegExp(
	`(?<![\\p{L}\\p{N}_-])(am|is|are|was|were|be|been|being|get|gets|got)(?:\\s+${ADVERBS})*\\s+(\\p{L}+)(?![\\p{L}\\p{N}_-])`,
	'giu',
);
const perfectRe = new RegExp(
	`(?<![\\p{L}\\p{N}_-])(has|have|had)(?:\\s+${ADVERBS})*\\s+(\\p{L}+)(?![\\p{L}\\p{N}_-])`,
	'giu',
);

function isParticiple(word) {
	const lower = word.toLowerCase();
	if (IRREGULAR_PARTICIPLES.has(lower)) return true;
	if (NOT_PARTICIPLES.has(lower)) return false;
	if (lower.startsWith('un') && lower.endsWith('ed')) return false;
	return lower.length >= 4 && lower.endsWith('ed');
}

// Split a paragraph into sentences. Each sentence keeps its start and end offsets.
export function splitSentences(text) {
	const sentences = [];
	let start = 0;
	const n = text.length;
	for (let i = 0; i < n; i += 1) {
		const ch = text[i];
		if (ch !== '.' && ch !== '!' && ch !== '?') continue;
		// Skip ellipses and decimals: they do not end a sentence.
		if (ch === '.' && (text[i + 1] === '.' || text[i - 1] === '.')) continue;
		if (ch === '.' && /\d/.test(text[i + 1] ?? '')) continue;
		let j = i + 1;
		while (j < n && /["'’”)\]]/.test(text[j])) j += 1;
		if (j < n && !/\s/.test(text[j])) continue;
		let k = j;
		while (k < n && /\s/.test(text[k])) k += 1;
		const nextChar = text[k] ?? '';
		if (ch === '.') {
			const before = text.slice(start, i);
			const lastWord = (before.match(/([\p{L}.]+)$/u) ?? [])[1]?.toLowerCase() ?? '';
			if (ABBREVIATIONS_BEFORE_PERIOD.has(lastWord)) continue;
			if (/^[A-Z]$/.test(lastWord)) continue;
			if (nextChar !== '' && /\p{Ll}/u.test(nextChar)) continue;
		}
		pushSentence(sentences, text, start, j);
		start = k;
	}
	pushSentence(sentences, text, start, n);
	return sentences;
}

function pushSentence(list, text, start, end) {
	const raw = text.slice(start, end);
	const trimmedStart = start + (raw.length - raw.trimStart().length);
	const value = raw.trim();
	if (value.length === 0) return;
	list.push({ text: value, start: trimmedStart, end: trimmedStart + value.length });
}

// Replace Markdown and code tokens with one-word placeholders, so a `path/to/file.ts` or a URL
// counts as one word and never looks like a sentence end.
export function normalizeProse(text) {
	return text
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/`[^`]{1,400}`/g, 'CODE')
		.replace(/\bhttps?:\/\/\S+/gi, 'URL')
		.replace(/<\/?[a-zA-Z][^>\n]*>/g, ' ')
		.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2')
		.replace(/(^|\s)[*_](?=\S)([^*_\n]*?\S)[*_](?=\s|$|[.,;:])/g, '$1$2')
		.replace(/&nbsp;/g, ' ')
		.replace(/[ \t]+/g, ' ');
}

// ---------------------------------------------------------------------------------------------
// Checks on one paragraph (a "segment": text plus the line where it starts)
// ---------------------------------------------------------------------------------------------

export function checkSegment(segment, options = {}) {
	const maxWords = options.maxWords ?? DEFAULT_MAX_WORDS;
	const text = normalizeProse(segment.text);
	const findings = [];
	const lineAt = (offset) => segment.line + countNewlines(text, offset);
	const sentences = splitSentences(text);

	if (sentences.length > MAX_SENTENCES_PER_PARAGRAPH) {
		findings.push({
			rule: 'paragraph-length',
			line: segment.line,
			endLine: lineAt(text.length),
			message: `${sentences.length} sentences in one paragraph, the limit is ${MAX_SENTENCES_PER_PARAGRAPH}. Start a new paragraph for the next topic.`,
			excerpt: excerptOf(sentences[0].text),
		});
	}

	for (const sentence of sentences) {
		const line = lineAt(sentence.start);
		const endLine = lineAt(sentence.end);
		const push = (rule, message, at = null) =>
			findings.push({
				rule,
				line: at === null ? line : lineAt(at),
				endLine: at === null ? endLine : lineAt(at),
				message,
				excerpt: excerptOf(sentence.text),
			});

		const words = countWords(sentence.text);
		if (words > maxWords) {
			push('sentence-length', `${words} words, the limit is ${maxWords}. Split the sentence.`);
		}

		for (const { phrase, suggestion, re } of bannedMatchers) {
			re.lastIndex = 0;
			const m = re.exec(sentence.text);
			if (m)
				push('banned-word', `"${phrase}" is not an approved word. Write "${suggestion}".`, sentence.start + m.index);
		}
		for (const { phrase, suggestion, re } of contractionMatchers) {
			re.lastIndex = 0;
			const m = re.exec(sentence.text);
			if (m) push('contraction', `"${phrase}" is a contraction. Write "${suggestion}".`, sentence.start + m.index);
		}

		const dash = findDash(sentence.text);
		if (dash !== -1) {
			push('dash-clause', 'A dash joins two ideas. Write two sentences, or use a comma.', sentence.start + dash);
		}

		if (/…|\.\.\./.test(sentence.text)) {
			push('ellipsis', 'An ellipsis hides items. List the items, or end the sentence.');
		}

		const parenRe = /\(([^()\n]*)\)/g;
		let pm = parenRe.exec(sentence.text);
		while (pm !== null) {
			const inner = countWords(pm[1]);
			if (inner > MAX_WORDS_IN_PARENTHESES) {
				push(
					'parenthesis',
					`${inner} words in parentheses. Write them as a separate sentence.`,
					sentence.start + pm.index,
				);
			}
			pm = parenRe.exec(sentence.text);
		}

		passiveRe.lastIndex = 0;
		let pv = passiveRe.exec(sentence.text);
		while (pv !== null) {
			if (isParticiple(pv[2])) {
				push(
					'passive-voice',
					`"${flat(pv[0])}" is passive. Name the actor and use the active voice.`,
					sentence.start + pv.index,
				);
				break;
			}
			pv = passiveRe.exec(sentence.text);
		}

		perfectRe.lastIndex = 0;
		let pf = perfectRe.exec(sentence.text);
		while (pf !== null) {
			if (pf[2].toLowerCase() === 'been' || isParticiple(pf[2])) {
				push(
					'perfect-tense',
					`"${flat(pf[0])}" is a perfect tense. Use the simple past or the simple present.`,
					sentence.start + pf.index,
				);
				break;
			}
			pf = perfectRe.exec(sentence.text);
		}

		const gerund = findGerund(sentence.text);
		if (gerund) {
			push(
				'gerund',
				`"${flat(gerund.match)}" uses an -ing verb form. Write "${gerund.trigger} you <verb>" or use the noun.`,
				sentence.start + gerund.index,
			);
		}
	}

	for (const f of findings) f.level = RULES[f.rule].level;
	return findings;
}

function countNewlines(text, offset) {
	let count = 0;
	for (let i = 0; i < offset && i < text.length; i += 1) {
		if (text[i] === '\n') count += 1;
	}
	return count;
}

function flat(text) {
	return text.replace(/\s+/g, ' ');
}

function excerptOf(sentence) {
	const flat = sentence.replace(/\s+/g, ' ').trim();
	return flat.length > 90 ? `${flat.slice(0, 87)}...` : flat;
}

function findDash(text) {
	for (let i = 0; i < text.length; i += 1) {
		const ch = text[i];
		if (ch === '—') return i;
		if (ch === '–') {
			const digits = /\d/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? '');
			if (!digits) return i;
		}
		if (ch === '-' && text[i + 1] === '-' && /\s/.test(text[i - 1] ?? ' ') && /\s/.test(text[i + 2] ?? ' ')) {
			return i;
		}
	}
	return -1;
}

function findGerund(text) {
	const first = text.match(/^(\p{L}+ing)(?![\p{L}\p{N}_-])/u);
	if (first && !ING_ALLOWED.has(first[1].toLowerCase())) {
		return { match: first[1], trigger: 'When', index: 0 };
	}
	gerundTriggerRe.lastIndex = 0;
	let m = gerundTriggerRe.exec(text);
	while (m !== null) {
		const word = m[2];
		if (!ING_ALLOWED.has(word.toLowerCase()) && word.length > 4) {
			const index = m.index + m[0].indexOf(m[1]);
			return { match: `${m[1]} ${word}`, trigger: m[1], index };
		}
		m = gerundTriggerRe.exec(text);
	}
	return null;
}

// ---------------------------------------------------------------------------------------------
// Markdown: paragraphs, list items, table cells and blockquotes. Code blocks and headings are
// not prose.
// ---------------------------------------------------------------------------------------------

export function extractMarkdownSegments(text) {
	const lines = text.split('\n');
	const segments = [];
	let fence = null;
	let current = null;
	let inFrontMatter = false;
	let inHtmlComment = false;

	const flush = () => {
		if (current?.lines.some((l) => l.trim().length > 0)) {
			segments.push({ line: current.line, text: current.lines.join('\n') });
		}
		current = null;
	};

	for (let i = 0; i < lines.length; i += 1) {
		const lineNo = i + 1;
		let line = lines[i];

		if (i === 0 && line.trim() === '---') {
			inFrontMatter = true;
			continue;
		}
		if (inFrontMatter) {
			if (line.trim() === '---') inFrontMatter = false;
			continue;
		}
		if (inHtmlComment) {
			if (line.includes('-->')) inHtmlComment = false;
			continue;
		}
		if (/^\s*<!--/.test(line) && !line.includes('-->')) {
			flush();
			inHtmlComment = true;
			continue;
		}
		line = line.replace(/<!--[\s\S]*?-->/g, '');

		const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
		if (fence) {
			if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
			continue;
		}
		if (fenceMatch) {
			flush();
			fence = fenceMatch[1];
			continue;
		}

		// Blockquote markers are layout, not prose.
		line = line.replace(/^(\s*>)+\s?/, '');

		if (line.trim().length === 0) {
			flush();
			continue;
		}
		if (/^\s{0,3}#{1,6}\s/.test(line) || /^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
			flush();
			continue;
		}
		if (/^\s*\|/.test(line)) {
			flush();
			if (/^\s*\|?\s*:?-{2,}/.test(line)) continue;
			const cells = line
				.trim()
				.replace(/^\|/, '')
				.replace(/\|$/, '')
				.split(/(?<!\\)\|/);
			for (const cell of cells) {
				if (cell.trim().length > 0) segments.push({ line: lineNo, text: cell.trim() });
			}
			continue;
		}
		const listMatch = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.*)$/);
		if (listMatch) {
			flush();
			current = { line: lineNo, lines: [listMatch[1]] };
			continue;
		}
		if (current) {
			current.lines.push(line.trim());
		} else {
			current = { line: lineNo, lines: [line.trim()] };
		}
	}
	flush();
	return segments;
}

// ---------------------------------------------------------------------------------------------
// Source code: comments only
// ---------------------------------------------------------------------------------------------

const REGEX_PRECEDERS = new Set([
	'(',
	',',
	'=',
	':',
	'[',
	'!',
	'&',
	'|',
	'?',
	'{',
	'}',
	';',
	'+',
	'-',
	'*',
	'%',
	'<',
	'>',
	'~',
	'^',
]);
const REGEX_KEYWORDS = new Set([
	'return',
	'typeof',
	'case',
	'in',
	'of',
	'do',
	'else',
	'void',
	'delete',
	'throw',
	'instanceof',
	'yield',
	'await',
]);

export function extractComments(text, ext) {
	if (HASH_EXTENSIONS.has(ext)) return cleanupSegments(extractHashComments(text));
	if (HTML_EXTENSIONS.has(ext)) return cleanupSegments(extractJsLikeComments(text, { htmlOnly: true }));
	return cleanupSegments(extractJsLikeComments(text, { htmlOnly: false }));
}

function extractJsLikeComments(text, { htmlOnly }) {
	const raw = [];
	const lineComments = [];
	let state = htmlOnly ? 'html-code' : 'code';
	let buf = '';
	let bufLine = 1;
	let line = 1;
	let lastWord = '';
	let lastChar = '';
	let lineHasCode = false;
	let bufOwn = true;
	let i = 0;
	const n = text.length;

	const flushLineComments = () => {
		if (lineComments.length > 0) {
			raw.push(...groupLineComments(lineComments));
			lineComments.length = 0;
		}
	};

	while (i < n) {
		const ch = text[i];
		const next = text[i + 1];
		if (ch === '\n') line += 1;
		switch (state) {
			case 'html-code': {
				if (text.startsWith('<!--', i)) {
					state = 'html';
					buf = '';
					bufLine = line;
					i += 4;
					continue;
				}
				i += 1;
				continue;
			}
			case 'code': {
				if (ch === '\n') lineHasCode = false;
				if (ch === '/' && next === '/') {
					state = 'line';
					buf = '';
					bufLine = line;
					bufOwn = !lineHasCode;
					i += 2;
					continue;
				}
				if (ch === '/' && next === '*') {
					flushLineComments();
					state = 'block';
					buf = '';
					bufLine = line;
					i += 2;
					continue;
				}
				if (text.startsWith('<!--', i)) {
					flushLineComments();
					state = 'html';
					buf = '';
					bufLine = line;
					i += 4;
					continue;
				}
				if (ch === "'") state = 'sq';
				else if (ch === '"') state = 'dq';
				else if (ch === '`') state = 'tpl';
				else if (ch === '/' && regexCanStart(lastChar, lastWord)) state = 'regex';
				if (/[\p{L}\p{N}_$]/u.test(ch)) {
					lastWord = /[\p{L}\p{N}_$]/u.test(lastChar) ? lastWord + ch : ch;
				}
				if (!/\s/.test(ch)) {
					lastChar = ch;
					lineHasCode = true;
				}
				i += 1;
				continue;
			}
			case 'sq':
			case 'dq': {
				lineHasCode = true;
				if (ch === '\\') {
					i += 2;
					continue;
				}
				if ((state === 'sq' && ch === "'") || (state === 'dq' && ch === '"') || ch === '\n') state = 'code';
				i += 1;
				continue;
			}
			case 'tpl': {
				lineHasCode = true;
				if (ch === '\\') {
					i += 2;
					continue;
				}
				if (ch === '`') state = 'code';
				i += 1;
				continue;
			}
			case 'regex': {
				lineHasCode = true;
				if (ch === '\\') {
					i += 2;
					continue;
				}
				if (ch === '/' || ch === '\n') state = 'code';
				i += 1;
				continue;
			}
			case 'line': {
				if (ch === '\n') {
					lineComments.push({ line: bufLine, text: buf, own: bufOwn });
					state = 'code';
					lineHasCode = false;
				} else {
					buf += ch;
				}
				i += 1;
				continue;
			}
			case 'block': {
				if (ch === '*' && next === '/') {
					raw.push(...splitBlockComment(buf, bufLine));
					state = 'code';
					i += 2;
					continue;
				}
				buf += ch;
				i += 1;
				continue;
			}
			case 'html': {
				if (text.startsWith('-->', i)) {
					raw.push(...splitBlockComment(buf, bufLine));
					state = htmlOnly ? 'html-code' : 'code';
					i += 3;
					continue;
				}
				buf += ch;
				i += 1;
				continue;
			}
			default: {
				i += 1;
				continue;
			}
		}
	}
	if (state === 'line') lineComments.push({ line: bufLine, text: buf, own: bufOwn });
	flushLineComments();
	return raw;
}

function regexCanStart(lastChar, lastWord) {
	if (lastChar === '') return true;
	if (REGEX_PRECEDERS.has(lastChar)) return true;
	return /[\p{L}_$]/u.test(lastChar) && REGEX_KEYWORDS.has(lastWord);
}

// Consecutive `//` lines are one comment. An empty `//` line starts a new paragraph.
function groupLineComments(items) {
	const groups = [];
	let current = null;
	for (const item of items) {
		const content = item.text.replace(/^\/*\s?/, '');
		const own = item.own !== false;
		const continues = current && item.line === current.lastLine + 1 && own && current.own;
		if (!continues || content.trim().length === 0) {
			if (current) groups.push(current);
			current = content.trim().length === 0 ? null : { line: item.line, lastLine: item.line, own, lines: [content] };
			continue;
		}
		current.lines.push(content);
		current.lastLine = item.line;
	}
	if (current) groups.push(current);
	return groups.map((g) => ({ line: g.line, text: g.lines.join('\n') }));
}

// A block comment: strip the leading `*`, drop JSDoc tags, split paragraphs on blank lines.
function splitBlockComment(body, firstLine) {
	const lines = body.split('\n').map((l) => l.replace(/^\s*\*+ ?/, '').replace(/\s+$/, ''));
	const segments = [];
	let current = null;
	for (let i = 0; i < lines.length; i += 1) {
		let content = lines[i];
		content = content.replace(
			/^@(param|property|prop|arg|argument|typedef|callback|template)\b(\s*\{[^}]*\})?\s*\S*\s*/i,
			'',
		);
		content = content.replace(/^@\w+\b(\s*\{[^}]*\})?\s*/, '');
		if (content.trim().length === 0) {
			if (current) segments.push(current);
			current = null;
			continue;
		}
		if (!current) current = { line: firstLine + i, lines: [] };
		current.lines.push(content.trim());
	}
	if (current) segments.push(current);
	return segments.map((s) => ({ line: s.line, text: s.lines.join('\n') }));
}

function extractHashComments(text) {
	const items = [];
	const lines = text.split('\n');
	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i];
		if (i === 0 && line.startsWith('#!')) continue;
		const idx = findHashStart(line);
		if (idx === -1) continue;
		items.push({
			line: i + 1,
			text: line.slice(idx + 1).replace(/^#*/, ''),
			own: line.slice(0, idx).trim() === '',
		});
	}
	return groupLineComments(items);
}

function findHashStart(line) {
	let singles = 0;
	let doubles = 0;
	for (let i = 0; i < line.length; i += 1) {
		const ch = line[i];
		if (ch === "'" && doubles % 2 === 0) singles += 1;
		else if (ch === '"' && singles % 2 === 0) doubles += 1;
		else if (ch === '#' && singles % 2 === 0 && doubles % 2 === 0) {
			if (i === 0 || /\s/.test(line[i - 1])) return i;
		}
	}
	return -1;
}

function cleanupSegments(segments) {
	return segments.filter((segment) => {
		const text = segment.text.trim();
		if (text.length === 0) return false;
		const lower = text.toLowerCase();
		if (DIRECTIVE_PREFIXES.some((p) => lower.startsWith(p))) return false;
		if (looksLikeCode(text)) return false;
		return true;
	});
}

const CODE_LINE_RE =
	/[;{}]\s*$|=>|^\s*(const|let|var|import|export|return|if|for|while|function|class|await)\b|^\s*[\w.$]+\([^()]*\)\s*;?$|^\s*[\w$]+\s*=\s*\S/;

function looksLikeCode(text) {
	const lines = text.split('\n').filter((l) => l.trim().length > 0);
	if (lines.length === 0) return false;
	if (/[.!?:]$/.test(lines[lines.length - 1].trim())) return false;
	const codeLike = lines.filter((l) => CODE_LINE_RE.test(l)).length;
	return codeLike / lines.length >= 0.5;
}

// ---------------------------------------------------------------------------------------------
// Files, scope, diffs
// ---------------------------------------------------------------------------------------------

export function loadConfig(root) {
	const file = join(root, '.ste-check.json');
	if (!existsSync(file)) return {};
	try {
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch {
		return {};
	}
}

export function classifyPath(path, config = {}) {
	const ext = extname(path).toLowerCase();
	const normalized = path.split('\\').join('/');
	const docDirs = config.docDirs ?? DOC_DIRS;
	if (MARKDOWN_EXTENSIONS.has(ext)) {
		const inDocDir = docDirs.some(
			(d) => normalized === d || normalized.startsWith(`${d}/`) || normalized.includes(`/${d}/`),
		);
		return inDocDir ? 'doc' : 'markdown';
	}
	if (JS_LIKE_EXTENSIONS.has(ext) || HTML_EXTENSIONS.has(ext) || HASH_EXTENSIONS.has(ext)) return 'code';
	return null;
}

export function checkFileText(path, text, options = {}) {
	const kind = classifyPath(path, options.config);
	if (kind === null) return [];
	const ext = extname(path).toLowerCase();
	const segments = kind === 'code' ? extractComments(text, ext) : extractMarkdownSegments(text);
	const findings = [];
	for (const segment of segments) {
		for (const f of checkSegment(segment, options)) findings.push({ ...f, file: path });
	}
	findings.sort((a, b) => a.line - b.line);
	return findings;
}

function walk(dir, out) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) walk(full, out);
		else out.push(full);
	}
	return out;
}

function expandPaths(paths, root) {
	const files = [];
	for (const p of paths) {
		const full = isAbsolute(p) ? p : resolve(root, p);
		if (!existsSync(full)) continue;
		if (statSync(full).isDirectory()) walk(full, files);
		else files.push(full);
	}
	return files.map((f) => relative(root, f) || basename(f));
}

// Parse `git diff -U0` output into { file: [[start, end], ...] } of added lines.
export function parseAddedRanges(diff) {
	const ranges = {};
	let file = null;
	for (const line of diff.split('\n')) {
		if (line.startsWith('+++ ')) {
			const target = line.slice(4).trim();
			file = target === '/dev/null' ? null : target.replace(/^b\//, '');
			if (file) ranges[file] = ranges[file] ?? [];
			continue;
		}
		const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
		if (hunk && file) {
			const start = Number(hunk[1]);
			const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
			if (count > 0) ranges[file].push([start, start + count - 1]);
		}
	}
	return ranges;
}

export function inRanges(finding, ranges) {
	const endLine = finding.endLine ?? finding.line;
	return ranges.some(([start, end]) => finding.line <= end && endLine >= start);
}

function gitDiff(args, root) {
	try {
		return execFileSync('git', ['diff', '--no-color', '-U0', '--diff-filter=ACMR', ...args], {
			cwd: root,
			encoding: 'utf8',
			maxBuffer: 64 * 1024 * 1024,
		});
	} catch (error) {
		process.stderr.write(`ste-check: git diff failed: ${error.message}\n`);
		return '';
	}
}

function gitRoot() {
	try {
		return execFileSync('git', ['rev-parse', '--show-toplevel'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
	} catch {
		return process.cwd();
	}
}

// ---------------------------------------------------------------------------------------------
// Claude Code hook mode: read the tool input, check only the new text, report on stderr.
// ---------------------------------------------------------------------------------------------

export function hookTextFromInput(input) {
	const toolInput = input?.tool_input ?? {};
	const filePath = toolInput.file_path ?? toolInput.path ?? null;
	if (!filePath) return null;
	let text = null;
	if (typeof toolInput.content === 'string') text = toolInput.content;
	else if (Array.isArray(toolInput.edits)) {
		text = toolInput.edits.map((e) => e?.new_string ?? '').join('\n\n');
	} else if (typeof toolInput.new_string === 'string') text = toolInput.new_string;
	if (text === null) return null;
	return { filePath, text };
}

// True when the file is under one of the directories, or when there is no restriction.
export function pathWithin(filePath, prefixes) {
	if (!prefixes || prefixes.length === 0) return true;
	const full = resolve(filePath);
	return prefixes.some((p) => {
		const prefix = resolve(p);
		return full === prefix || full.startsWith(`${prefix}/`);
	});
}

function runHook(options) {
	let input;
	try {
		input = JSON.parse(readFileSync(0, 'utf8'));
	} catch {
		return 0;
	}
	const extracted = hookTextFromInput(input);
	if (!extracted) return 0;
	if (!pathWithin(extracted.filePath, options.only)) return 0;
	const root = gitRoot();
	const config = loadConfig(root);
	const relPath = relative(root, extracted.filePath) || extracted.filePath;
	const kind = classifyPath(relPath, config);
	if (kind !== 'doc' && kind !== 'code') return 0;
	const findings = checkFileText(relPath, extracted.text, { ...options, config });
	if (findings.length === 0) return 0;
	const errors = findings.filter((f) => f.level === 'error').length;
	const shown = findings.slice(0, 25);
	const lines = [
		`STE-100 writing rules: ${findings.length} finding(s) in the text you wrote to ${relPath}, ${errors} must be fixed.`,
		'Rewrite the new text so that it follows the rules, then continue. Reference: architecture-design-records/STE100-WRITING-RULES.md (sitenova).',
		...shown.map((f) => `- [${f.rule}${f.level === 'error' ? '' : ', check'}] ${f.message} Text: "${f.excerpt}"`),
	];
	if (findings.length > shown.length) lines.push(`- ... and ${findings.length - shown.length} more.`);
	process.stderr.write(`${lines.join('\n')}\n`);
	return 2;
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

function parseArgs(argv) {
	const options = {
		paths: [],
		changed: null,
		staged: false,
		hook: false,
		strict: false,
		summary: false,
		format: 'human',
		docs: false,
		code: false,
		maxWords: DEFAULT_MAX_WORDS,
		only: null,
		help: false,
	};
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--changed') options.changed = argv[++i] ?? 'HEAD';
		else if (arg === '--staged') options.staged = true;
		else if (arg === '--hook') options.hook = true;
		else if (arg === '--strict') options.strict = true;
		else if (arg === '--summary') options.summary = true;
		else if (arg === '--docs') options.docs = true;
		else if (arg === '--code') options.code = true;
		else if (arg === '--format') options.format = argv[++i] ?? 'human';
		else if (arg === '--max-words') options.maxWords = Number(argv[++i] ?? DEFAULT_MAX_WORDS);
		else if (arg === '--only') options.only = (argv[++i] ?? '').split(',').filter(Boolean);
		else if (arg === '--help' || arg === '-h') options.help = true;
		else options.paths.push(arg);
	}
	return options;
}

function usage() {
	return [
		'Usage: node scripts/ste-check.mjs [paths...] [--changed <ref> | --staged | --hook]',
		'       [--strict] [--summary] [--docs] [--code] [--format human|github|json] [--max-words <n>] [--only <dir,dir>]',
		'With no paths, the script checks the Markdown under the document directories: plans/ and',
		'architecture-design-records/. Pass paths, --changed or --staged to check code comments.',
	].join('\n');
}

function wantKind(kind, options) {
	if (options.docs && !options.code) return kind === 'doc';
	if (options.code && !options.docs) return kind === 'code';
	return kind === 'doc' || kind === 'code' || kind === 'markdown';
}

function formatFinding(f, format) {
	const title = `ste/${f.rule}`;
	if (format === 'github') {
		const kind = f.level === 'error' ? 'error' : 'warning';
		const msg = `${f.message} Text: "${f.excerpt}"`.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
		return `::${kind} file=${f.file},line=${f.line},title=${title}::${msg}`;
	}
	return `${f.file}:${f.line}  ${f.level.padEnd(7)} ${f.rule.padEnd(16)} ${f.message}\n    "${f.excerpt}"`;
}

function printSummary(findings, filesChecked) {
	const perRule = {};
	for (const f of findings) perRule[f.rule] = (perRule[f.rule] ?? 0) + 1;
	const rows = Object.entries(perRule).sort((a, b) => b[1] - a[1]);
	const files = new Set(findings.map((f) => f.file)).size;
	process.stdout.write(
		`Files checked: ${filesChecked}. Files with findings: ${files}. Findings: ${findings.length}.\n`,
	);
	for (const [rule, count] of rows) {
		process.stdout.write(`  ${rule.padEnd(18)} ${String(count).padStart(6)}  (${RULES[rule].level})\n`);
	}
}

export function main(argv = process.argv.slice(2)) {
	const options = parseArgs(argv);
	if (options.help) {
		process.stdout.write(`${usage()}\n`);
		return 0;
	}
	if (options.hook) return runHook(options);

	const root = gitRoot();
	const config = loadConfig(root);
	if (config.maxWords && options.maxWords === DEFAULT_MAX_WORDS) options.maxWords = config.maxWords;
	const checkOptions = { maxWords: options.maxWords, config };

	let files = [];
	let ranges = null;
	if (options.changed !== null || options.staged) {
		const args = options.staged ? ['--cached'] : [options.changed];
		if (options.paths.length > 0) args.push('--', ...options.paths);
		ranges = parseAddedRanges(gitDiff(args, root));
		files = Object.keys(ranges);
	} else if (options.paths.length > 0) {
		files = expandPaths(options.paths, root);
	} else {
		const docDirs = (config.docDirs ?? DOC_DIRS).filter((d) => existsSync(join(root, d)));
		if (docDirs.length === 0) {
			process.stdout.write('ste-check: nothing to check here. Pass paths, --changed <ref> or --staged.\n');
			return 0;
		}
		files = expandPaths(docDirs, root);
	}

	const findings = [];
	let checked = 0;
	for (const file of files) {
		const kind = classifyPath(file, config);
		if (kind === null || !wantKind(kind, options)) continue;
		// Explicit Markdown paths outside the document directories are checked too.
		const full = resolve(root, file);
		if (!existsSync(full)) continue;
		checked += 1;
		let fileFindings = checkFileText(file, readFileSync(full, 'utf8'), checkOptions);
		if (ranges) fileFindings = fileFindings.filter((f) => inRanges(f, ranges[file] ?? []));
		findings.push(...fileFindings);
	}

	if (options.format === 'json') {
		process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
	} else if (options.summary) {
		printSummary(findings, checked);
	} else {
		for (const f of findings) process.stdout.write(`${formatFinding(f, options.format)}\n`);
		const errors = findings.filter((f) => f.level === 'error').length;
		if (options.format === 'human') {
			process.stdout.write(
				findings.length === 0
					? `ste-check: ${checked} file(s), no findings.\n`
					: `ste-check: ${checked} file(s), ${findings.length} finding(s), ${errors} error(s).\n`,
			);
		}
	}
	const hasErrors = findings.some((f) => f.level === 'error');
	return options.strict && hasErrors ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	process.exitCode = main();
}
