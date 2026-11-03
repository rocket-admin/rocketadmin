// Port of CedarWasmService. The package's default init loads `cedar_wasm_bg.wasm` through
// `new URL(..., import.meta.url)`, which Vite emits as a hashed asset.
type CedarWasmModule = typeof import('@cedar-policy/cedar-wasm/web');

let loading: Promise<CedarWasmModule> | null = null;

export function loadCedarWasm(): Promise<CedarWasmModule> {
	if (!loading) {
		loading = (async () => {
			const cedar = await import('@cedar-policy/cedar-wasm/web');
			await cedar.default();
			return cedar;
		})().catch((error) => {
			loading = null;
			throw error;
		});
	}
	return loading;
}
