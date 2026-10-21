// Replaces NgxThemeService.updateColors as ConnectionsService used it: a connection can carry a
// custom accent (`connectionProperties.secondary_color`). The Material palette generator is gone,
// so the colour overrides the semantic accent tokens from theme.css inline on <html>; without one
// the inline override is removed and the theme.css defaults apply again.
//
// `primary_color` is not mapped: the design system has no primary-brand surface to recolour.

/** The tokens a connection's accent overrides. Everything else in theme.css is left alone. */
export const CONNECTION_ACCENT_TOKENS = ['--color-accent', '--color-accent-ink', '--color-hot'] as const;

/**
 * Applies `color` as the accent, deriving the darker ink (text and pressed states on the accent)
 * and the light "hot" tint the same way theme.css pairs blue-600 with blue-700 and blue-300.
 * Returns whether a custom accent is now active; an empty or invalid colour resets instead.
 */
export function applyConnectionAccent(
	color: string | null | undefined,
	root: HTMLElement = document.documentElement,
): boolean {
	const accent = color?.trim();
	if (!accent || !isValidColor(accent)) {
		resetConnectionAccent(root);
		return false;
	}
	root.style.setProperty('--color-accent', accent);
	root.style.setProperty('--color-accent-ink', `color-mix(in oklab, ${accent} 80%, black)`);
	root.style.setProperty('--color-hot', `color-mix(in oklab, ${accent} 45%, white)`);
	return true;
}

export function resetConnectionAccent(root: HTMLElement = document.documentElement): void {
	for (const token of CONNECTION_ACCENT_TOKENS) root.style.removeProperty(token);
}

// The value comes from the backend; refuse anything that isn't a colour rather than writing an
// arbitrary string into a custom property. jsdom has no CSS.supports, so tests accept everything.
function isValidColor(value: string): boolean {
	if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return true;
	return CSS.supports('color', value);
}
