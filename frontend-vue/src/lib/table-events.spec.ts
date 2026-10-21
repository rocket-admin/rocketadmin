import { describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { onTableEvent, tableEvents } from './table-events';

describe('table events', () => {
	it('delivers events until the owning scope is disposed', () => {
		const handler = vi.fn();
		const scope = effectScope();
		scope.run(() => onTableEvent('rowsDeleted', handler));

		tableEvents.emit('rowsDeleted', { connectionID: 'c', tableName: 't' });
		scope.stop();
		tableEvents.emit('rowsDeleted', { connectionID: 'c', tableName: 't' });

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith({ connectionID: 'c', tableName: 't' });
	});

	it('returns an unsubscribe function outside a scope', () => {
		const handler = vi.fn();
		const off = onTableEvent('imported', handler);
		off();
		tableEvents.emit('imported', { connectionID: 'c', tableName: 't' });
		expect(handler).not.toHaveBeenCalled();
	});
});
