<script setup lang="ts">
// Port of frontend/src/app/components/dashboards/dashboard-edit-dialog: creates a dashboard, or
// renames / re-describes one, and closes with `true`. The store refreshes the dashboards list.
import { computed, ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { UiField, UiInput, UiTextarea } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import type { Dashboard } from '@/models/dashboard';
import { useDashboardsStore } from '@/stores/dashboards';
import { trackDashboardsEvent } from './analytics';

const props = defineProps<{ data: { connectionId: string; dashboard: Dashboard | null } }>();

const dialogRef = useDialogRef<boolean>();
const dashboards = useDashboardsStore();

const isEdit = !!props.data.dashboard;
const name = ref(props.data.dashboard?.name || '');
const description = ref(props.data.dashboard?.description || '');
const nameTouched = ref(false);
const submitting = ref(false);

const nameError = computed(() => {
	if (name.value.length > 255) return 'Name must be less than 255 characters';
	if (nameTouched.value && !name.value) return 'Name is required';
	return undefined;
});
const descriptionError = computed(() =>
	description.value.length > 1000 ? 'Description must be less than 1000 characters' : undefined,
);
const invalid = computed(() => !name.value || name.value.length > 255 || description.value.length > 1000);

async function onSubmit(): Promise<void> {
	if (invalid.value) return;

	submitting.value = true;
	const payload = { name: name.value, description: description.value };
	try {
		const dashboard = props.data.dashboard;
		if (dashboard) {
			const result = await dashboards.updateDashboard(props.data.connectionId, dashboard.id, payload);
			if (result) {
				trackDashboardsEvent('Dashboards: dashboard updated successfully');
				dialogRef.close(true);
			}
		} else {
			const result = await dashboards.createDashboard(props.data.connectionId, payload);
			if (result) {
				trackDashboardsEvent('Dashboards: dashboard created successfully');
				dialogRef.close(true);
			}
		}
	} catch {
		// The client has shown the error.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AppDialogForm
		:title="isEdit ? 'Edit dashboard' : 'Create dashboard'"
		:submit-label="submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'"
		:busy="submitting"
		:disabled="invalid"
		@submit="onSubmit"
	>
		<div class="dashboard-form">
			<UiField label="Name" :error="nameError" required>
				<UiInput
					v-model="name"
					placeholder="Enter dashboard name"
					data-testid="dashboard-name-input"
					@blur="nameTouched = true"
				/>
			</UiField>
			<UiField label="Description" :error="descriptionError">
				<UiTextarea
					v-model="description"
					:rows="3"
					placeholder="Enter dashboard description (optional)"
					data-testid="dashboard-description-input"
				/>
			</UiField>
		</div>
	</AppDialogForm>
</template>

<style scoped>
.dashboard-form {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
	min-width: min(400px, 100%);
}
</style>
