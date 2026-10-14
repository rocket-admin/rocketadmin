#!/usr/bin/env node
// Turns a c8 `coverage-summary.json` (reporter `json-summary`) into the two things CI publishes:
//
//   node scripts/coverage-report.mjs badge <coverage-summary.json> <out.svg> [label]
//       → a shields-style SVG badge ("<label> | 81.3%") from the LINE coverage percentage.
//         Dependency-free on purpose: the repo is private, so shields.io / codecov cannot read it,
//         and the badge has to be a file we host ourselves (the `badges` branch, see tests.yml).
//
//   node scripts/coverage-report.mjs markdown <name> <coverage-summary.json>
//       → a Markdown table (lines / statements / functions / branches) for $GITHUB_STEP_SUMMARY.
//
// Exit code 1 on a missing / malformed summary, so a broken coverage step fails loudly instead of
// publishing a stale or empty badge.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const METRICS = ['lines', 'statements', 'functions', 'branches'];

function readSummary(file) {
	let parsed;
	try {
		parsed = JSON.parse(readFileSync(file, 'utf8'));
	} catch (error) {
		throw new Error(`cannot read coverage summary ${file}: ${error.message}`);
	}
	const total = parsed?.total;
	for (const metric of METRICS) {
		if (typeof total?.[metric]?.pct !== 'number') {
			throw new Error(`coverage summary ${file} has no numeric total.${metric}.pct`);
		}
	}
	return total;
}

// Same thresholds the usual coverage badges use (coverage-badge-py / shields "coverage" presets).
function colorFor(pct) {
	if (pct >= 90) return '#4c1';
	if (pct >= 80) return '#97ca00';
	if (pct >= 70) return '#a4a61d';
	if (pct >= 60) return '#dfb317';
	if (pct >= 50) return '#fe7d37';
	return '#e05d44';
}

function escapeXml(text) {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Verdana 11px is ~6.5px per character on average; textLength pins the rendered width to the
// estimate so a font substitution cannot overflow the box.
function textWidth(text) {
	return Math.round(text.length * 6.5);
}

function badgeSvg(label, message, color) {
	const labelWidth = textWidth(label) + 10;
	const messageWidth = textWidth(message) + 10;
	const width = labelWidth + messageWidth;
	const title = escapeXml(`${label}: ${message}`);
	const l = escapeXml(label);
	const m = escapeXml(message);
	// Text is drawn at 10x and scaled down, like shields does, for crisper sub-pixel placement.
	const lx = (labelWidth / 2) * 10;
	const mx = (labelWidth + messageWidth / 2) * 10;
	const ll = (labelWidth - 10) * 10;
	const ml = (messageWidth - 10) * 10;
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${title}">`,
		`<title>${title}</title>`,
		'<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>',
		`<clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>`,
		`<g clip-path="url(#r)"><rect width="${labelWidth}" height="20" fill="#555"/><rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/><rect width="${width}" height="20" fill="url(#s)"/></g>`,
		'<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">',
		`<text aria-hidden="true" x="${lx}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${ll}">${l}</text>`,
		`<text x="${lx}" y="140" transform="scale(.1)" textLength="${ll}">${l}</text>`,
		`<text aria-hidden="true" x="${mx}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${ml}">${m}</text>`,
		`<text x="${mx}" y="140" transform="scale(.1)" textLength="${ml}">${m}</text>`,
		'</g>',
		'</svg>',
		'',
	].join('\n');
}

function formatPct(pct) {
	return `${pct.toFixed(1)}%`;
}

function main(argv) {
	const [command, ...rest] = argv;
	if (command === 'badge') {
		const [file, out, label = 'coverage'] = rest;
		if (!file || !out) throw new Error('usage: badge <coverage-summary.json> <out.svg> [label]');
		const total = readSummary(file);
		const pct = total.lines.pct;
		mkdirSync(dirname(out), { recursive: true });
		writeFileSync(out, badgeSvg(label, formatPct(pct), colorFor(pct)));
		process.stdout.write(`${out}: ${label} ${formatPct(pct)} (lines)\n`);
		return;
	}
	if (command === 'markdown') {
		const [name, file] = rest;
		if (!name || !file) throw new Error('usage: markdown <name> <coverage-summary.json>');
		const total = readSummary(file);
		const lines = [
			`### ${name} test coverage`,
			'',
			'| Metric | Covered | Total | % |',
			'| --- | ---: | ---: | ---: |',
			...METRICS.map(
				(metric) =>
					`| ${metric} | ${total[metric].covered} | ${total[metric].total} | ${formatPct(total[metric].pct)} |`,
			),
			'',
		];
		process.stdout.write(`${lines.join('\n')}\n`);
		return;
	}
	throw new Error('usage: coverage-report.mjs <badge|markdown> ...');
}

try {
	main(process.argv.slice(2));
} catch (error) {
	process.stderr.write(`coverage-report: ${error instanceof Error ? error.message : String(error)}\n`);
	process.exit(1);
}
