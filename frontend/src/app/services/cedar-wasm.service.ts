import { Injectable } from '@angular/core';

type CedarWasmModule = typeof import('@cedar-policy/cedar-wasm/web');

@Injectable({ providedIn: 'root' })
export class CedarWasmService {
	private _module: CedarWasmModule | null = null;
	private _loading: Promise<CedarWasmModule> | null = null;

	async load(): Promise<CedarWasmModule> {
		if (this._module) return this._module;
		if (this._loading) return this._loading;

		this._loading = (async () => {
			const cedar = await import('@cedar-policy/cedar-wasm/web');
			const wasmBytes = await fetch('/assets/cedar-wasm/cedar_wasm_bg.wasm').then((r) => r.arrayBuffer());
			cedar.initSync({ module: new WebAssembly.Module(wasmBytes) });
			this._module = cedar;
			return cedar;
		})();

		return this._loading;
	}
}
