<script setup lang="ts">
/** Port of record-view-fields/password (`PasswordRecordViewComponent`): always masked, the value is never rendered. */
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

defineProps<RecordViewFieldProps & { value?: unknown }>();
defineEmits<ViewFieldEmits>();
</script>

<template>
	<RecordViewValue>••••••••</RecordViewValue>
</template>
