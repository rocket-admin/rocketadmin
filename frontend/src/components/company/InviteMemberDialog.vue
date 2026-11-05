<script setup lang="ts">
// Port of frontend/src/app/components/company/invite-member-dialog: invites a user by email, with
// a company role and optionally a connection group. SaaS builds require a Turnstile token, and a
// failed invite asks for a fresh one.
import { computed, ref } from 'vue';
import { trackAuthEvent } from '@/components/auth/analytics';
import TurnstileWidget from '@/components/auth/TurnstileWidget.vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { type SelectOption, UiField, UiInput, UiSelect } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import { environment } from '@/environment';
import { type Company, type CompanyConnection, CompanyMemberRole } from '@/models/company';
import { useCompanyStore } from '@/stores/company';
import { EMAIL_ERROR_MESSAGE, emailErrors } from '@/validators/email.validator';
import CompanyRoleMenu from './CompanyRoleMenu.vue';

const props = defineProps<{
	/** The company to invite into; its connections supply the groups. */
	data: Pick<Company, 'id' | 'name' | 'connections'>;
}>();

const dialogRef = useDialogRef<void>();
const companyStore = useCompanyStore();
const isSaas = environment.saas;

const companyMemberEmail = ref('');
const emailTouched = ref(false);
const companyMemberRole = ref<CompanyMemberRole>(CompanyMemberRole.Member);
const companyUsersGroup = ref<string | null>(null);
const submitting = ref(false);
const turnstileToken = ref<string | null>(null);
const turnstile = ref<InstanceType<typeof TurnstileWidget> | null>(null);

/** Test connections last, as Angular sorted them. */
const connections = computed(() =>
	[...(props.data.connections ?? [])].sort(
		(a: CompanyConnection, b: CompanyConnection) => Number(a.isTestConnection ?? 0) - Number(b.isTestConnection ?? 0),
	),
);

const groupOptions = computed<SelectOption<string>[]>(() =>
	connections.value.flatMap((connection) =>
		(connection.groups ?? []).map((group) => ({ value: group.id, label: group.title, group: connection.title })),
	),
);

const emailError = computed(() => {
	if (emailErrors(companyMemberEmail.value)) return EMAIL_ERROR_MESSAGE;
	if (emailTouched.value && !companyMemberEmail.value) return 'Email should not be empty.';
	return undefined;
});

const formInvalid = computed(() => !companyMemberEmail.value || Boolean(emailErrors(companyMemberEmail.value)));

async function addCompanyMember() {
	submitting.value = true;
	try {
		await companyStore.inviteCompanyMember(
			props.data.id,
			companyUsersGroup.value ?? '',
			companyMemberEmail.value,
			companyMemberRole.value,
			isSaas ? (turnstileToken.value ?? undefined) : undefined,
		);
		trackAuthEvent('Company: member is invited successfully');
		dialogRef.close();
	} catch {
		resetTurnstile();
	} finally {
		submitting.value = false;
	}
}

function resetTurnstile() {
	if (isSaas && turnstile.value) {
		turnstile.value.reset();
		turnstileToken.value = null;
	}
}
</script>

<template>
	<AppDialogForm
		:title="`Add member to ${data.name} company`"
		submit-label="Add"
		:disabled="submitting || formInvalid || (isSaas && !turnstileToken)"
		@submit="addCompanyMember"
	>
		<div class="invite-member">
			<UiField label="Enter user email" :error="emailError" required>
				<UiInput
					v-model="companyMemberEmail"
					type="email"
					name="email"
					autocomplete="off"
					:disabled="submitting"
					@blur="emailTouched = true"
				/>
			</UiField>

			<CompanyRoleMenu
				:role="companyMemberRole"
				variant="secondary"
				@open="trackAuthEvent('Company: role is clicked')"
				@select="companyMemberRole = $event"
			/>

			<UiField label="Group">
				<UiSelect v-model="companyUsersGroup" :options="groupOptions" placeholder="-- None --" name="connectionGroup" />
			</UiField>

			<TurnstileWidget
				v-if="isSaas"
				ref="turnstile"
				@token-received="turnstileToken = $event"
				@token-error="turnstileToken = null"
				@token-expired="turnstileToken = null"
			/>
		</div>
	</AppDialogForm>
</template>

<style scoped>
.invite-member {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}
</style>
