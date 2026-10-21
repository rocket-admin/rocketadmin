<script setup lang="ts">
/**
 * Port of record-view-fields/foreign-key (`ForeignKeyRecordViewComponent`): the referenced row's
 * display value as a router link to that row (`link`, query = `primaryKeysParams` + `mode=view`).
 * Only `null`/`undefined` render a dash — `0` and `''` are real values and stay links.
 *
 * Extra inputs beyond the shared contract, as in Angular: `link`, `primaryKeysParams`,
 * `displayValue`; the `onForeignKeyClick` output is the `foreignKeyClick` event.
 */
import { computed } from 'vue';
import type { LocationQueryRaw } from 'vue-router';
import { RouterLink } from 'vue-router';
import { UiIcon } from '@/components/ui';
import type { RecordViewFieldProps } from '../types';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<
	RecordViewFieldProps & {
		value?: unknown;
		/** Path of the referenced table's entry page, e.g. `/dashboard/<conn>/<table>/entry`. */
		link?: string;
		/** Primary key of the referenced row, `{ [referenced_column]: value }`. */
		primaryKeysParams?: Record<string, unknown>;
		/** Text shown for the reference; `null`/`undefined` renders a dash. */
		displayValue?: string | number | null;
	}
>();

const emit = defineEmits<{
	copyToClipboard: [message: string];
	foreignKeyClick: [payload: { foreignKey: Record<string, unknown> | undefined; value: string | number }];
}>();

const foreignKeyURLParams = computed<LocationQueryRaw>(() => {
	const query: LocationQueryRaw = {};
	for (const [key, value] of Object.entries(props.primaryKeysParams ?? {})) {
		query[key] = value == null ? null : String(value);
	}
	return { ...query, mode: 'view' };
});

function onClick() {
	if (props.displayValue == null) return;
	emit('foreignKeyClick', { foreignKey: props.primaryKeysParams, value: props.displayValue });
}
</script>

<template>
	<RecordViewValue v-if="displayValue == null">—</RecordViewValue>
	<RouterLink
		v-else
		:to="{ path: link ?? '', query: foreignKeyURLParams }"
		class="foreign-key-record-view__link"
		@click="onClick"
	>
		<RecordViewValue>{{ displayValue }}</RecordViewValue>
		<UiIcon name="visibility" size="sm" />
	</RouterLink>
</template>

<style scoped>
.foreign-key-record-view__link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  border-bottom: 1px solid var(--color-ink-soft);
}
</style>
