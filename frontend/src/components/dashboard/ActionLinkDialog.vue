<script setup lang="ts">
// Port of db-table-view/db-action-link-dialog: a custom action answered with a location to go to;
// the dialog offers it as a link ("Take action … for id = 1.") and closes once it is followed.
import AppDialog from '@/components/dialog/AppDialog.vue';
import { UiButton } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import type { ActionLinkDialogData } from './types';

defineProps<{ data: ActionLinkDialogData }>();

const dialogRef = useDialogRef();
</script>

<template>
	<AppDialog title="Action" size="sm" data-testid="action-link-dialog">
		<a :href="data.href" target="_blank" rel="noopener noreferrer" class="action-link" @click="dialogRef.close()">
			Take action {{ data.actionName }} for
			<strong v-if="data.identityFieldValue">{{ data.identityFieldValue }}</strong>
			<template v-else>
				<strong v-for="(entry, index) in Object.entries(data.primaryKeys ?? {})" :key="entry[0]">
					{{ entry[0] }} = {{ entry[1] }}<span v-if="index < Object.keys(data.primaryKeys ?? {}).length - 1">,</span>
				</strong>
			</template>.
		</a>

		<template #footer>
			<UiButton variant="secondary" @click="dialogRef.close()">Cancel</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.action-link {
	color: var(--color-accent);
}
</style>
