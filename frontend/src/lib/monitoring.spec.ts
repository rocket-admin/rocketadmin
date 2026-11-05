import type { Event } from '@sentry/vue';
import { describe, expect, it } from 'vitest';
import { toAngularRoutePath, toAngularSentryEvent } from './monitoring';

describe('toAngularRoutePath', () => {
	it('uses the Angular param names', () => {
		expect(toAngularRoutePath('/dashboard/:connectionId/:tableName/entry')).toBe(
			'/dashboard/:connection-id/:table-name/entry',
		);
		expect(toAngularRoutePath('/company/:companyId/verify/:verificationToken')).toBe(
			'/company/:company-id/verify/:verification-token',
		);
		expect(toAngularRoutePath('/connections-list')).toBe('/connections-list');
	});

	it('names the 404 route like the Angular catch-all', () => {
		expect(toAngularRoutePath('/:pathMatch(.*)*')).toBe('**');
	});
});

describe('toAngularSentryEvent', () => {
	it('renames the transaction and param attributes, and drops query values', () => {
		const event: Event = {
			transaction: '/dashboard/:connectionId/:tableName',
			contexts: {
				trace: {
					trace_id: 't',
					span_id: 's',
					data: {
						'url.template': '/dashboard/:connectionId/:tableName',
						'url.path.parameter.connectionId': 'c1',
						'params.tableName': 'users',
						'query.filters': '(email:(eq:a@b.c))',
						'query.id': '7',
						'sentry.op': 'navigation',
					},
				},
			},
		};

		const result = toAngularSentryEvent(event);

		expect(result.transaction).toBe('/dashboard/:connection-id/:table-name');
		expect(result.contexts?.trace?.data).toEqual({
			'url.template': '/dashboard/:connection-id/:table-name',
			'url.path.parameter.connection-id': 'c1',
			'params.table-name': 'users',
			'sentry.op': 'navigation',
		});
	});

	it('leaves events without route data alone', () => {
		expect(toAngularSentryEvent({ message: 'boom' })).toEqual({ message: 'boom' });
	});
});
