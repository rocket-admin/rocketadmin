<script setup lang="ts">
// Port of frontend/src/app/components/dashboard/db-table-view/db-table-widgets/widget: one row of
// the widgets form — the column (picked once, from the columns without a widget), the widget type
// with its docs link, the JSON5 params editor (read-only for types without settings), and the
// displayed name and description. Changes are emitted; the page owns the widget list.
//
// The root uses `display: contents`, so the cells line up in the page's six-column grid.
import { computed } from 'vue';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import {
	type SelectOption,
	UiButton,
	UiField,
	UiIcon,
	UiIconButton,
	UiInput,
	UiSelect,
	UiTextarea,
} from '@/components/ui';
import type { Widget } from '@/models/table';
import { WIDGET_DOCS_URLS } from './widget-defaults';

const props = defineProps<{
	index: number;
	widget: Widget;
	/** Columns that have no widget yet. */
	fields: string[];
	widgetTypes: string[];
	isReadonlyParams: boolean;
}>();

const emit = defineEmits<{
	/** A column was picked for a new widget. */
	selectField: [field: string];
	typeChange: [type: string];
	paramsChange: [value: string];
	update: [patch: Partial<Pick<Widget, 'name' | 'description'>>];
	delete: [];
}>();

const fieldOptions = computed<SelectOption<string>[]>(() =>
	props.fields.map((field) => ({ value: field, label: field })),
);
const typeOptions = computed<SelectOption<string>[]>(() =>
	props.widgetTypes.map((type) => ({ value: type, label: type })),
);
const docsUrl = computed(() => WIDGET_DOCS_URLS[props.widget.widget_type]);

function onField(value: string | string[] | null) {
	if (typeof value === 'string') emit('selectField', value);
}

function onType(value: string | string[] | null) {
	if (typeof value === 'string') emit('typeChange', value);
}
</script>

<template>
	<div class="widget-item" :data-testid="`widget-item-${index}`">
		<span v-if="widget.field_name" class="widget-item__field-name">{{ widget.field_name }}</span>
		<UiField v-else label="Field">
			<UiSelect
				:model-value="null"
				:options="fieldOptions"
				placeholder=""
				:name="`${widget.field_name}-field-name`"
				data-testid="widget-field-select"
				@update:model-value="onField"
			/>
		</UiField>

		<div class="widget-item__type">
			<UiField label="Displayed field type">
				<UiSelect
					:model-value="widget.widget_type"
					:options="typeOptions"
					:name="`${widget.field_name}-field-type`"
					data-testid="widget-type-select"
					@update:model-value="onType"
				/>
			</UiField>
			<UiButton v-if="docsUrl" variant="secondary" size="sm" :href="docsUrl" target="_blank" rel="noopener noreferrer" class="widget-item__docs">
				Docs
				<template #trailing><UiIcon name="open_in_new" size="sm" /></template>
			</UiButton>
		</div>

		<AppCodeEditor
			class="widget-item__params"
			:model-value="widget.widget_params"
			language="json"
			:label="`${widget.field_name || 'Widget'} params`"
			:readonly="isReadonlyParams"
			height="10rem"
			:options="{ lineNumbersMinChars: 3, folding: false }"
			@update:model-value="emit('paramsChange', $event)"
		/>

		<UiField label="Displayed field name">
			<UiInput
				:model-value="widget.name"
				:name="`${widget.field_name}-field-new-name`"
				@update:model-value="emit('update', { name: $event })"
			/>
		</UiField>

		<UiField label="Displayed field description">
			<UiTextarea
				:model-value="widget.description"
				:rows="2"
				:name="`${widget.field_name}-field-description`"
				@update:model-value="emit('update', { description: $event })"
			/>
		</UiField>

		<UiIconButton icon="delete" label="Delete widget" class="widget-item__delete" @click="emit('delete')" />
	</div>
</template>

<style scoped>
.widget-item {
	display: contents;
}

.widget-item__field-name {
	align-self: baseline;
	margin-top: var(--space-6);
	font-weight: var(--weight-medium);
	word-break: break-all;
}

.widget-item__type {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--space-2);
}

.widget-item__params {
	margin-top: var(--space-6);
	resize: vertical;
}

.widget-item__delete {
	margin-top: var(--space-6);
}

/* On phones each widget is a card; as in Angular, the delete button is desktop-only. */
@media (width <= 600px) {
	.widget-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4);
		border: 1px solid var(--color-line);
		border-radius: var(--radius-card);
		background: var(--color-surface);
	}

	.widget-item__field-name,
	.widget-item__params {
		margin-top: 0;
	}

	.widget-item__delete {
		display: none;
	}
}
</style>
