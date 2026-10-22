<script setup lang="ts">
// Port of frontend/src/app/components/audit/info-dialog: what one audit log entry did. Edits of a
// row compare the old and new values field by field and highlight the changed ones; every other
// action lists the row's values.
//
// The Angular "one row" table passed the key/value pair (not the key) to its changed/sensitive
// checks, so it never highlighted or hid anything there; that behaviour is kept. Its keyvalue pipe
// listed the fields sorted by key, which is kept too.
import { format } from 'date-fns';
import { computed } from 'vue';
import AppDialog from '@/components/dialog/AppDialog.vue';
import { UiButton } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import { normalizeFieldName, normalizeTableName } from '@/lib/normalize';
import type { AuditLogDetails } from './useAuditLog';

const props = defineProps<{ data: AuditLogDetails }>();

const dialogRef = useDialogRef();

const SENSITIVE = '* * * sensitive data, no logs stored * * *';

const ACTIONS: Record<string, Record<string, string>> = {
	successfully: {
		addRow: 'added the row',
		deleteRow: 'deleted the row',
		updateRow: 'edited the row',
		rowReceived: 'received the row',
		rowsReceived: 'received rows',
	},
	unsuccessfully: {
		addRow: 'attempted to add the row',
		deleteRow: 'attempted to delete the row',
		updateRow: 'attempted to edit the row',
		rowReceived: 'attempted to receive the row',
		rowsReceived: 'attempted to receive rows',
	},
};

const log = computed(() => props.data);

const formattedCreatedAt = computed(() => (log.value.createdAt ? format(new Date(log.value.createdAt), 'PPPpp') : ''));
const action = computed(() => ACTIONS[log.value.Status]?.[log.value.operationType] ?? '');
const normalizedTableName = computed(() => (log.value.Table ? normalizeTableName(log.value.Table) : ''));

const currentValue = computed<Record<string, unknown>>(() => log.value.currentValue ?? {});
const prevValue = computed<Record<string, unknown>>(() => log.value.prevValue ?? {});
const fields = computed(() => Object.keys(currentValue.value));
const sortedFields = computed(() => [...fields.value].sort());

/** Fields whose value an edit changed; empty unless the old values are known. */
const diffFields = computed<string[]>(() => {
	if (log.value.operationType !== 'updateRow' || !log.value.prevValue || !log.value.currentValue) return [];
	const current = log.value.currentValue;
	return Object.entries(log.value.prevValue)
		.filter(([key, value]) => current[key] !== value)
		.map(([key]) => key);
});

function isSensitive(field: string): boolean {
	return currentValue.value[field] === SENSITIVE;
}

function display(value: unknown): string {
	if (value == null) return '';
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}
</script>

<template>
	<AppDialog title="Log details" size="lg">
		<p class="audit-info__preamble ph-no-capture" data-block="preamble">
			{{ log.User }} {{ action }} in "{{ normalizedTableName }}" table on {{ formattedCreatedAt }} {{ log.Status }}.
		</p>

		<div v-if="diffFields.length > 0" class="audit-info__details" data-block="comparison-details">
			<table class="audit-info__table">
				<tbody>
					<tr
						v-for="field in fields"
						:key="field"
						:data-line="`${field}-field`"
						:class="['audit-info__row', { 'audit-info__row--changed': diffFields.includes(field) }]"
					>
						<th class="audit-info__name" scope="row">{{ normalizeFieldName(field) }}</th>
						<td v-if="!isSensitive(field)" class="audit-info__value ph-no-capture">
							{{ display(prevValue[field]) }}
						</td>
						<td
							:class="['audit-info__value', 'ph-no-capture', { 'audit-info__value--sensitive': isSensitive(field) }]"
							:colspan="isSensitive(field) ? 2 : undefined"
						>
							{{ display(currentValue[field]) }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<table v-else-if="log.currentValue" class="audit-info__table" data-block="one-row-details">
			<tbody>
				<tr v-for="field in sortedFields" :key="field" class="audit-info__row">
					<th class="audit-info__name" scope="row">{{ normalizeFieldName(field) }}</th>
					<td class="audit-info__value ph-no-capture">{{ display(currentValue[field]) }}</td>
				</tr>
			</tbody>
		</table>

		<template #footer>
			<UiButton @click="dialogRef.close()">Ok</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.audit-info__preamble {
	margin: 0;
	color: var(--color-ink-soft);
	line-height: var(--leading-normal);
	overflow-wrap: anywhere;
}

.audit-info__details {
	margin-top: var(--space-4);
}

.audit-info__table {
	width: 100%;
	margin-top: var(--space-3);
	border-collapse: collapse;
	border-top: 1px solid var(--color-line);
}

.audit-info__name,
.audit-info__value {
	padding: var(--space-2) var(--space-8) var(--space-2) var(--space-6);
	border-bottom: 1px solid var(--color-line);
	color: var(--color-ink);
	text-align: start;
	vertical-align: top;
	overflow-wrap: anywhere;
}

.audit-info__name {
	font-weight: var(--weight-medium);
}

.audit-info__row--changed {
	background: color-mix(in srgb, var(--color-accent) 14%, var(--color-surface));
}

.audit-info__value--sensitive {
	font-family: var(--font-mono);
	font-size: var(--text-sm);
	font-style: italic;
}
</style>
