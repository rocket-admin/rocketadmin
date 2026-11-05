// The password scorer behind PasswordStrength (replaces angular-password-strength-meter's zxcvbn
// service). zxcvbn-ts and its dictionaries are ~1 MB, so they load on first use, off the main bundle.
//
// Deviation: the Angular provider configured zxcvbn with the English translations only; this one
// also loads the common and English dictionaries (zxcvbn-ts' recommended setup), so dictionary
// words score lower. The meter is informational — form validity still comes from passwordValidation.

export interface PasswordFeedback {
	warning: string | null;
	suggestions: string[];
}

export interface PasswordScore {
	/** 0 (too guessable) … 4 (very unguessable). */
	score: number;
	feedback: PasswordFeedback;
}

export interface PasswordScorer {
	check(password: string): PasswordScore;
}

let scorer: Promise<PasswordScorer> | null = null;

export function loadPasswordScorer(): Promise<PasswordScorer> {
	scorer ??= createScorer().catch((error: unknown) => {
		scorer = null;
		throw error;
	});
	return scorer;
}

async function createScorer(): Promise<PasswordScorer> {
	const [{ ZxcvbnFactory }, common, en] = await Promise.all([
		import('@zxcvbn-ts/core'),
		import('@zxcvbn-ts/language-common'),
		import('@zxcvbn-ts/language-en'),
	]);
	const zxcvbn = new ZxcvbnFactory({
		dictionary: { ...common.dictionary, ...en.dictionary },
		graphs: common.adjacencyGraphs,
		translations: en.translations,
	});
	return {
		check(password) {
			const result = zxcvbn.check(password);
			return {
				score: result.score,
				feedback: { warning: result.feedback.warning, suggestions: result.feedback.suggestions },
			};
		},
	};
}
