import { describe, expect, it } from 'vitest';
import { useRowSelection } from './useRowSelection';

describe('useRowSelection', () => {
	const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
	const lookup = (key: string | number) => rows.find((row) => String(row.id) === String(key));

	it('keeps the rows behind the selected keys', () => {
		const selection = useRowSelection();
		selection.setKeys(['1', '3'], lookup);
		expect(selection.keys).toEqual(['1', '3']);
		expect(selection.selected).toEqual([{ id: 1 }, { id: 3 }]);
		expect(selection.hasValue).toBe(true);
		expect(selection.isSelected('3')).toBe(true);
	});

	it('remembers rows selected on another page', () => {
		const selection = useRowSelection();
		selection.setKeys(['1'], lookup);
		selection.setKeys(['1', 'x'], (key) => (key === 'x' ? { id: 'x' } : undefined));
		expect(selection.selected).toEqual([{ id: 1 }, { id: 'x' }]);
	});

	it('drops keys whose row is unknown', () => {
		const selection = useRowSelection();
		selection.setKeys(['nope'], lookup);
		expect(selection.keys).toEqual([]);
	});

	it('selects several rows at once and clears', () => {
		const selection = useRowSelection();
		selection.select(rows.map((row) => ({ key: String(row.id), row })));
		selection.select([{ key: '1', row: { id: 1 } }]);
		expect(selection.keys).toEqual(['1', '2', '3']);
		selection.clear();
		expect(selection.keys).toEqual([]);
		expect(selection.selected).toEqual([]);
		expect(selection.hasValue).toBe(false);
	});
});
