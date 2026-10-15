// Monaco is bundled by Vite with its workers as `?worker` chunks, replacing the
// `assets/monaco` copy the Angular build serves to @ngstack/code-editor.
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

type Monaco = typeof import('monaco-editor');

export function getMonacoWorker(label: string): Worker {
	switch (label) {
		case 'json':
			return new JsonWorker();
		case 'css':
		case 'scss':
		case 'less':
			return new CssWorker();
		case 'html':
		case 'handlebars':
		case 'razor':
			return new HtmlWorker();
		case 'typescript':
		case 'javascript':
			return new TsWorker();
		default:
			return new EditorWorker();
	}
}

let loading: Promise<Monaco> | null = null;

// Monaco is large, so it is loaded on first use and kept in its own chunk.
export function loadMonaco(): Promise<Monaco> {
	if (!loading) {
		self.MonacoEnvironment = { getWorker: (_workerId, label) => getMonacoWorker(label) };
		loading = import('monaco-editor');
	}
	return loading;
}
