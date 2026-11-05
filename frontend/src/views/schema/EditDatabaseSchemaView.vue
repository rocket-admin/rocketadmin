<script setup lang="ts">
// Port of the routed /edit-database-schema/:connection-id use of EditDatabaseSchemaComponent: the
// AI schema editor as a page (back link + title, diagram loaded on open). The editor itself is
// SchemaEditor, which the dashboard can also embed.
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import SchemaEditor from '@/components/schema/SchemaEditor.vue';

const route = useRoute();

const connectionId = computed(() => String(route.params.connectionId ?? ''));
</script>

<template>
	<div class="edit-database-schema">
		<SchemaEditor :key="connectionId" :connection-id="connectionId" routed />
	</div>
</template>

<style scoped>
.edit-database-schema {
	display: flex;
	height: calc(100vh - var(--header-height) - var(--footer-height));
	min-height: 30rem;
}
</style>
