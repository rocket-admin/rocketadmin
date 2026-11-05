/**
 * Composables replacing the Angular `base-*` classes. Each widget calls the one for its family
 * instead of extending a base component:
 *
 *   const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
 *   const emit = defineEmits<RecordEditFieldEmits>();
 *   const { normalizedLabel, widgetParams } = useRecordEditField(props);
 */
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { copyToClipboard } from '@/lib/clipboard';
import { normalizeFieldName } from '@/lib/normalize';
import type { WidgetStructure } from '@/models/table';
import type { RecordEditFieldProps, ViewFieldEmits } from './types';

export const COPIED_MESSAGE = 'Field value was copied to clipboard.';

/**
 * `widget_params` as an object. The API hands them over either parsed or as a JSON string
 * (depending on the endpoint), and every Angular widget repeated the `typeof … === 'string'`
 * check; an unparseable string yields `{}` rather than throwing in a template.
 */
// biome-ignore lint/suspicious/noExplicitAny: widget params are free-form per widget type
export function parseWidgetParams(widgetStructure: WidgetStructure | null | undefined): Record<string, any> {
	const params: unknown = widgetStructure?.widget_params;
	if (!params) return {};
	if (typeof params === 'string') {
		try {
			const parsed: unknown = JSON.parse(params);
			// biome-ignore lint/suspicious/noExplicitAny: see above
			return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : {};
		} catch {
			return {};
		}
	}
	// biome-ignore lint/suspicious/noExplicitAny: see above
	return typeof params === 'object' ? (params as Record<string, any>) : {};
}

/** `BaseEditFieldComponent`: the normalized label and the parsed widget params. */
export function useRecordEditField(props: RecordEditFieldProps) {
	const normalizedLabel = computed(() => normalizeFieldName(props.label || ''));
	const widgetParams = computed(() => parseWidgetParams(props.widgetStructure));
	return { normalizedLabel, widgetParams };
}

/** `BaseFilterFieldComponent`: identical inputs to the edit widgets, plus `autofocus`. */
export const useFilterField = useRecordEditField;

/**
 * `BaseRecordViewFieldComponent` / `BaseTableDisplayFieldComponent`: parsed widget params and the
 * copy button, which emits the snackbar message the host shows (the Angular `onCopyToClipboard`).
 */
export function useViewField(
	props: { widgetStructure?: WidgetStructure },
	emit: (event: 'copyToClipboard', message: string) => void,
) {
	const widgetParams = computed(() => parseWidgetParams(props.widgetStructure));

	async function copy(text: MaybeRefOrGetter<unknown>, message = COPIED_MESSAGE): Promise<void> {
		const value = toValue(text);
		if (await copyToClipboard(value == null ? '' : String(value))) emit('copyToClipboard', message);
	}

	return { widgetParams, copy };
}

export type { ViewFieldEmits };
