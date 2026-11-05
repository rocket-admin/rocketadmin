<script setup lang="ts">
// Renders one opened dialog and hands it its DialogRef.
import { provide } from 'vue';
import { DIALOG_REF, type DialogEntry } from '@/composables/useDialog';

const props = defineProps<{ entry: DialogEntry }>();

provide(DIALOG_REF, props.entry.ref);
</script>

<template>
	<component :is="entry.component" :data="entry.data" />
</template>
