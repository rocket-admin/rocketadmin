// Mermaid, imported on first use (it is large) and initialized once with the options Angular's
// MERMAID_OPTIONS gave ngx-markdown (see lib/mermaid-config.ts).
import type { Mermaid } from 'mermaid';
import { mermaidConfig } from '@/lib/mermaid-config';

let loading: Promise<Mermaid> | null = null;
let renderCount = 0;

function loadMermaid(): Promise<Mermaid> {
	loading ??= import('mermaid')
		.then((module) => {
			const mermaid = module.default;
			mermaid.initialize(mermaidConfig());
			return mermaid;
		})
		.catch((error: unknown) => {
			loading = null;
			throw error;
		});
	return loading;
}

/** Renders a Mermaid source to SVG markup. Rejects on a syntax error. */
export async function renderMermaid(source: string): Promise<string> {
	const mermaid = await loadMermaid();
	const { svg } = await mermaid.render(`schema-diagram-${++renderCount}`, source);
	return svg;
}
