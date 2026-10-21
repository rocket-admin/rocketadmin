<script setup lang="ts">
/**
 * Port of record-view-fields/s3 (`S3RecordViewComponent`): an S3 object key. With
 * `widget_params.type: 'image'` a presigned URL is fetched on mount (current connection and table,
 * this row's primary keys) and the image is previewed; any other type shows the key.
 */
import { computed, onMounted, ref } from 'vue';
import { UiSpinner } from '@/components/ui';
import { useConnectionsStore } from '@/stores/connections';
import { useS3Store } from '@/stores/s3';
import { useTablesStore } from '@/stores/tables';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams } = useViewField(props, emit);
const connections = useConnectionsStore();
const tables = useTablesStore();
const s3 = useS3Store();

const previewUrl = ref<string | null>(null);
const isLoading = ref(false);

const isImageType = computed(() => widgetParams.value.type === 'image');

onMounted(() => {
	if (props.value && isImageType.value && props.primaryKeys) loadPreview();
});

async function loadPreview(): Promise<void> {
	const connectionId = connections.connectionID;
	const tableName = tables.tableName;
	const primaryKeys = props.primaryKeys;
	if (!props.value || !connectionId || !tableName || !primaryKeys) return;

	isLoading.value = true;
	const response = await s3.getFileUrl(connectionId, tableName, props.widgetStructure?.field_name ?? '', primaryKeys);
	if (response) previewUrl.value = response.url;
	isLoading.value = false;
}
</script>

<template>
	<template v-if="isImageType">
		<UiSpinner v-if="isLoading" class="s3-record-view__spinner" label="Loading image" />
		<img v-else-if="previewUrl" class="s3-record-view__preview" :src="previewUrl" alt="S3 Image">
		<RecordViewValue v-else-if="value">[S3 Image]</RecordViewValue>
	</template>
	<RecordViewValue v-else>{{ value || '—' }}</RecordViewValue>
</template>

<style scoped>
.s3-record-view__preview {
  display: block;
  width: 100%;
  max-width: 300px;
  height: auto;
  margin-bottom: var(--space-2);
}

.s3-record-view__spinner {
  margin-block: var(--space-2);
}
</style>
