// Port of frontend/src/app/services/cedar-validator.service.ts: syntax-checks a Cedar policy set in
// the wasm engine (the policy editor dialog validates before saving).
import { loadCedarWasm } from '@/lib/cedar-wasm';

export interface CedarValidationResult {
	valid: boolean;
	errors: string[];
}

/** An empty policy is valid: it grants nothing. */
export async function validateCedarPolicy(policyText: string): Promise<CedarValidationResult> {
	if (!policyText.trim()) return { valid: true, errors: [] };

	const cedar = await loadCedarWasm();
	const result = cedar.checkParsePolicySet({ staticPolicies: policyText, templates: {}, templateLinks: [] });
	if (result.type === 'success') return { valid: true, errors: [] };

	return { valid: false, errors: (result.errors ?? []).map(errorMessage) };
}

export function useCedarValidator() {
	return { validate: validateCedarPolicy };
}

function errorMessage(error: unknown): string {
	if (typeof error === 'string') return error;
	if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
	return String(error);
}
