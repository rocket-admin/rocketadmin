import { afterEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import type { WidgetStructure } from '@/models/table';
import { COPIED_MESSAGE, parseWidgetParams, useRecordEditField, useViewField } from './useFieldWidget';

const widget = (widget_params: unknown): WidgetStructure =>
	({ field_name: 'f', widget_type: 'String', widget_params, name: '', description: '' }) as WidgetStructure;

describe('parseWidgetParams', () => {
	it('returns {} without a widget structure', () => {
		expect(parseWidgetParams(undefined)).toEqual({});
	});

	it('passes an object through', () => {
		expect(parseWidgetParams(widget({ validate: 'isEmail' }))).toEqual({ validate: 'isEmail' });
	});

	it('parses a JSON string', () => {
		expect(parseWidgetParams(widget('{"allow_null": true}'))).toEqual({ allow_null: true });
	});

	it('returns {} for an unparseable string', () => {
		expect(parseWidgetParams(widget('{nope'))).toEqual({});
	});
});

describe('useRecordEditField', () => {
	it('normalizes the label reactively', () => {
		const props = reactive({ label: 'user_first_name' });
		const { normalizedLabel } = useRecordEditField(props);
		expect(normalizedLabel.value).toBe('User first name');
		props.label = 'id';
		expect(normalizedLabel.value).toBe('ID');
	});
});

describe('useViewField', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('copies the value and emits the snackbar message', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', { clipboard: { writeText } });
		const emit = vi.fn();
		const { copy } = useViewField({}, emit);

		await copy(42);

		expect(writeText).toHaveBeenCalledWith('42');
		expect(emit).toHaveBeenCalledWith('copyToClipboard', COPIED_MESSAGE);
	});

	it('emits nothing when the clipboard is unavailable', async () => {
		vi.stubGlobal('navigator', {});
		const emit = vi.fn();
		await useViewField({}, emit).copy('x');
		expect(emit).not.toHaveBeenCalled();
	});
});
