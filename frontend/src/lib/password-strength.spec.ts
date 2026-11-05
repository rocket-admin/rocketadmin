import { describe, expect, it } from 'vitest';
import { loadPasswordScorer } from './password-strength';

describe('loadPasswordScorer', () => {
	it('scores with zxcvbn-ts and its English feedback', async () => {
		const scorer = await loadPasswordScorer();

		const weak = scorer.check('password');
		expect(weak.score).toBe(0);
		expect(weak.feedback.warning).toBeTruthy();

		expect(scorer.check('correct-Horse-battery-st4ple-92!').score).toBe(4);
	});

	it('loads once', () => {
		expect(loadPasswordScorer()).toBe(loadPasswordScorer());
	});
});
