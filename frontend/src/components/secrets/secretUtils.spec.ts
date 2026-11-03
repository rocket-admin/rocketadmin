import { describe, expect, it } from 'vitest';
import type { Secret } from '@/models/secret';
import { mockSecret } from './secretsTestUtils';
import { dateInputToIso, isExpired, isExpiringSoon, toDateInputValue } from './secretUtils';

function inDays(days: number): Secret {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return { ...mockSecret, expiresAt: date.toISOString() };
}

describe('secretUtils', () => {
	describe('isExpired', () => {
		it('is true for a past expiration', () => {
			expect(isExpired({ ...mockSecret, expiresAt: '2024-01-01' })).toBe(true);
		});

		it('is false for a future expiration', () => {
			expect(isExpired(inDays(365))).toBe(false);
		});

		it('is false without an expiration', () => {
			expect(isExpired(mockSecret)).toBe(false);
		});
	});

	describe('isExpiringSoon', () => {
		it('is true within 7 days', () => {
			expect(isExpiringSoon(inDays(3))).toBe(true);
		});

		it('is true at exactly 7 days', () => {
			const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - 1000);
			expect(isExpiringSoon({ ...mockSecret, expiresAt: date.toISOString() })).toBe(true);
		});

		it('is false beyond 7 days', () => {
			expect(isExpiringSoon(inDays(14))).toBe(false);
		});

		it('is false once expired', () => {
			expect(isExpiringSoon({ ...mockSecret, expiresAt: '2024-01-01' })).toBe(false);
		});

		it('is false without an expiration', () => {
			expect(isExpiringSoon(mockSecret)).toBe(false);
		});
	});

	describe('date input values', () => {
		it('formats a date as the local YYYY-MM-DD', () => {
			expect(toDateInputValue(new Date(2024, 0, 5))).toBe('2024-01-05');
		});

		it('turns a date input value into local midnight', () => {
			expect(dateInputToIso('2024-01-05')).toBe(new Date(2024, 0, 5).toISOString());
			expect(dateInputToIso('')).toBeUndefined();
		});
	});
});
