<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-audit-log.
//
// The Angular component was an unused `ng generate` stub ("placeholder-audit-log works!"); the audit
// page actually shows <app-placeholder-table-data> while loading. Ported as that, under the name the
// audit page will look for, so the stub's text never reaches a user.
import PlaceholderTableData from './PlaceholderTableData.vue';
</script>

<template>
	<PlaceholderTableData label="Loading audit log" />
</template>
