import { afterEach, describe, expect, it } from 'vitest';
import { applyConnectionAccent, CONNECTION_ACCENT_TOKENS, resetConnectionAccent } from './connection-theme';

describe('connection accent', () => {
	const root = document.documentElement;

	afterEach(() => root.removeAttribute('style'));

	it('overrides the accent tokens inline, deriving ink and hot from the colour', () => {
		expect(applyConnectionAccent('#654321')).toBe(true);
		expect(root.style.getPropertyValue('--color-accent')).toBe('#654321');
		expect(root.style.getPropertyValue('--color-accent-ink')).toContain('#654321');
		expect(root.style.getPropertyValue('--color-hot')).toContain('#654321');
	});

	it.each([null, undefined, '', '  '])('resets the override for %j', (color) => {
		applyConnectionAccent('#654321');
		expect(applyConnectionAccent(color)).toBe(false);
		for (const token of CONNECTION_ACCENT_TOKENS) expect(root.style.getPropertyValue(token)).toBe('');
	});

	it('leaves unrelated inline styles alone when resetting', () => {
		root.style.setProperty('--color-ink', 'black');
		applyConnectionAccent('#654321');
		resetConnectionAccent();
		expect(root.style.getPropertyValue('--color-ink')).toBe('black');
	});
});
