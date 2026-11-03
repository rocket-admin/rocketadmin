<script setup lang="ts">
/**
 * Port of table-display-fields/s3 (`S3DisplayComponent`): the S3 key, or for `type: 'image'` a
 * thumbnail fetched through a presigned URL for this row.
 */
import { computed, onMounted, ref } from 'vue';
import { UiSpinner } from '@/components/ui';
import { useConnectionsStore } from '@/stores/connections';
import { useS3Store } from '@/stores/s3';
import { useTablesStore } from '@/stores/tables';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams, copy } = useViewField(props, emit);
const s3 = useS3Store();
const connections = useConnectionsStore();
const tables = useTablesStore();

const previewUrl = ref<string | null>(null);
const isLoading = ref(false);

const isImageType = computed(() => widgetParams.value.type === 'image');

/** `{ [pk]: rowData[pk] }` for every primary key column, or null without row data / keys. */
const rowPrimaryKey = computed<Record<string, unknown> | null>(() => {
	if (!props.rowData || !props.primaryKeys) return null;
	const primaryKey: Record<string, unknown> = {};
	for (const pk of props.primaryKeys) primaryKey[pk.column_name] = props.rowData[pk.column_name];
	return primaryKey;
});

onMounted(() => {
	if (props.value && isImageType.value && rowPrimaryKey.value) loadPreview();
});

async function loadPreview(): Promise<void> {
	const primaryKey = rowPrimaryKey.value;
	const connectionId = connections.connectionID;
	const tableName = tables.tableName;
	const fieldName = props.widgetStructure?.field_name;
	if (!props.value || !connectionId || !tableName || !primaryKey || !fieldName) return;

	isLoading.value = true;
	const response = await s3.getFileUrl(connectionId, tableName, fieldName, primaryKey);
	if (response) previewUrl.value = response.url;
	isLoading.value = false;
}
</script>

<template>
	<TableDisplayCell
		:copyable="Boolean(value)"
		copy-label="Copy S3 key"
		@copy="copy(value, 'S3 key was copied to clipboard.')"
	>
		<template v-if="isImageType">
			<UiSpinner v-if="isLoading" class="s3-display__spinner" label="Loading image" />
			<img v-else-if="previewUrl" class="s3-display__thumbnail" :src="previewUrl" alt="S3 Image">
			<span v-else-if="value" class="s3-display__placeholder">[S3 Image]</span>
		</template>
		<span v-else class="s3-display__placeholder">{{ value || '—' }}</span>
	</TableDisplayCell>
</template>

<style scoped>
.s3-display__thumbnail {
  display: block;
  max-width: 100px;
  max-height: 60px;
  margin: var(--space-1) 0;
  object-fit: contain;
}

.s3-display__spinner {
  margin: var(--space-1) 0;
}

.s3-display__placeholder {
  font-style: italic;
  color: var(--color-muted);
}
</style>
