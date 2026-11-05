import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCedarWasm } from '@/lib/cedar-wasm';
import { useCedarValidator, validateCedarPolicy } from './useCedarValidator';

vi.mock('@/lib/cedar-wasm', () => ({ loadCedarWasm: vi.fn() }));

const checkParsePolicySet = vi.fn();

describe('useCedarValidator', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadCedarWasm).mockResolvedValue({ checkParsePolicySet } as unknown as Awaited<
			ReturnType<typeof loadCedarWasm>
		>);
	});

	it('accepts an empty policy without loading the engine', async () => {
		await expect(validateCedarPolicy('   \n')).resolves.toEqual({ valid: true, errors: [] });
		expect(loadCedarWasm).not.toHaveBeenCalled();
	});

	it('accepts a policy set that parses', async () => {
		checkParsePolicySet.mockReturnValue({ type: 'success' });

		await expect(useCedarValidator().validate('permit(principal, action, resource);')).resolves.toEqual({
			valid: true,
			errors: [],
		});
		expect(checkParsePolicySet).toHaveBeenCalledWith({
			staticPolicies: 'permit(principal, action, resource);',
			templates: {},
			templateLinks: [],
		});
	});

	it('returns the parse errors as strings', async () => {
		checkParsePolicySet.mockReturnValue({
			type: 'failure',
			errors: [{ message: 'unexpected token' }, 'plain string', 42],
		});

		await expect(validateCedarPolicy('permit(')).resolves.toEqual({
			valid: false,
			errors: ['unexpected token', 'plain string', '42'],
		});
	});

	it('copes with a failure without errors', async () => {
		checkParsePolicySet.mockReturnValue({ type: 'failure' });
		await expect(validateCedarPolicy('permit(')).resolves.toEqual({ valid: false, errors: [] });
	});
});
