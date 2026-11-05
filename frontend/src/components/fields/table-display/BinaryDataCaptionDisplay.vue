<script setup lang="ts">
/** Port of table-display-fields/binary-data-caption (`BinaryDataCaptionDisplayComponent`): a caption in place of binary data. */
import type { TableDisplayFieldProps } from '../types';
import TableDisplayCell from './TableDisplayCell.vue';

defineProps<TableDisplayFieldProps & { value?: string | null }>();
</script>

<template>
	<TableDisplayCell :copyable="false">{{ value || '—' }}</TableDisplayCell>
</template>
