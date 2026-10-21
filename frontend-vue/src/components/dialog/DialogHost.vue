<script setup lang="ts">
// Mounted once in App.vue: every dialog opened through useDialog() renders here.
import { useDialogsStore } from '@/composables/useDialog';
import DialogOutlet from './DialogOutlet.vue';

const dialogs = useDialogsStore();
</script>

<template>
	<DialogOutlet v-for="entry in dialogs.entries" :key="entry.id" :entry="entry" />
</template>
