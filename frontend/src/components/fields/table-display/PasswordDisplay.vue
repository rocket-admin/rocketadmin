<script setup lang="ts">
/** Port of table-display-fields/password (`PasswordDisplayComponent`): always masked, never copyable. */
import type { TableDisplayFieldProps } from '../types';
import TableDisplayCell from './TableDisplayCell.vue';

defineProps<TableDisplayFieldProps & { value?: string | null }>();
</script>

<template>
	<TableDisplayCell :copyable="false">••••••••</TableDisplayCell>
</template>
