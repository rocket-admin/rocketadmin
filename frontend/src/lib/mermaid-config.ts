// The options every `mermaid.initialize` uses. lib/markdown.ts and components/schema/mermaid.ts both
// initialize the same Mermaid singleton, so whichever loads second must not undo the first.
import type { MermaidConfig } from 'mermaid';

// Angular's dark themeVariables, re-tinted from purple to the dark ramp in assets/theme.css: Mermaid
// renders static SVG, so it can't follow the CSS tokens itself.
const MERMAID_DARK_OPTIONS: MermaidConfig = {
	theme: 'base',
	themeVariables: {
		darkMode: true,
		background: '#0a0f24',
		primaryColor: '#121a36',
		primaryBorderColor: '#2a3558',
		primaryTextColor: '#eef3ff',
		secondaryColor: '#1a2344',
		tertiaryColor: '#121a36',
		lineColor: '#7196ff',
		mainBkg: '#121a36',
		nodeBkg: '#121a36',
		nodeBorder: '#2a3558',
		clusterBkg: '#121a36',
		clusterBorder: '#2a3558',
		attributeBackgroundColorOdd: '#121a36',
		attributeBackgroundColorEven: '#1a2344',
		titleColor: '#eef3ff',
		edgeLabelBackground: '#121a36',
		textColor: '#eef3ff',
		labelTextColor: '#eef3ff',
		nodeTextColor: '#eef3ff',
	},
};

/**
 * The options every `mermaid.initialize` uses. Like Angular, mermaid reads the theme once, when it
 * first loads. The theme comes from the `data-theme` attribute that the ui-settings store sets.
 */
export function mermaidConfig(): MermaidConfig {
	const dark = document.documentElement.dataset.theme === 'dark';
	return { startOnLoad: false, ...(dark ? MERMAID_DARK_OPTIONS : { theme: 'default' }) };
}
