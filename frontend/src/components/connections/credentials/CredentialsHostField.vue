<script setup lang="ts">
// The Hostname field (hostnameValidator): required, a valid public hostname or IP, `https://` for
// DynamoDB. An internal address gets help to tunnel it through Pinggy or switch to an agent.
import { computed } from 'vue';
import { UiInput } from '@/components/ui';
import { HOSTNAME_ERROR_MESSAGES, hostnameErrors } from '@/validators/hostname.validator';
import CredentialsField from './CredentialsField.vue';
import { useCredentialsForm } from './credentialsForm';

const TUNNELING_SERVICE_LINK = 'https://docs.rocketadmin.com/Create%20connections/Direct%20connection/create_pinggy';

const props = withDefaults(
	defineProps<{
		/** The "E.g." sample under the field. */
		example: string;
		/** Second hint line. */
		note?: string;
		span?: 1 | 2 | 3 | 'full';
		/** Which hostname rules apply ('mongodb' accepts `mongodb+srv://`, 'dynamodb' wants `https://`). */
		validation?: 'default' | 'mongodb' | 'dynamodb';
	}>(),
	{ note: 'Connections from internal IPs (e.g. localhost) are not supported', span: 3, validation: 'default' },
);

const form = useCredentialsForm();

const host = computed({
	get: () => form.getText('host'),
	set: (value: string) => form.setText('host', value),
});

const errors = computed(() => hostnameErrors(host.value, props.validation));
const visibleErrors = computed(() => (form.showErrors('hostname') ? errors.value : null));
const isLocalhost = computed(() => Boolean(visibleErrors.value?.isLocalhost));

const error = computed(() => {
	const current = visibleErrors.value;
	if (!current) return undefined;
	if (current.isLocalhost) return HOSTNAME_ERROR_MESSAGES.isLocalhost;
	if (current.missingHttps) return HOSTNAME_ERROR_MESSAGES.missingHttps;
	return form.sentence(HOSTNAME_ERROR_MESSAGES.isInvalidHostname);
});

const hint = computed(() => [`E.g. ${props.example}`, props.note].filter(Boolean).join('. '));

function onChange() {
	form.track('hostname is edited');
	form.clearAutoFilled('host');
}
</script>

<template>
	<CredentialsField
		label="Hostname"
		:span="span"
		:hint="hint"
		:error="error"
		required
		:autofilled="form.isAutoFilled('host')"
	>
		<UiInput
			v-model="host"
			name="hostname"
			data-testid="connection-hostname-input"
			:readonly="Boolean(form.props.readonly)"
			:disabled="form.props.submitting"
			@input="form.markDirty('hostname')"
			@blur="form.touch('hostname')"
			@change="onChange"
		/>
		<template #after>
			<p v-if="isLocalhost" class="credentials-host__help">(<a :href="TUNNELING_SERVICE_LINK" target="_blank" rel="noopener" class="credentials-host__link">here's a guide to Pinggy</a>, or <button type="button" class="credentials-host__button" data-testid="connection-switch-to-agent-button" @click="form.switchToAgent()">click here</button> to connect through an agent)</p>
			<slot name="help" />
		</template>
	</CredentialsField>
</template>

<style scoped>
.credentials-host__help {
	margin: var(--space-1) 0 0;
	font-size: var(--text-xs);
	color: var(--color-danger);
}

.credentials-host__link,
.credentials-host__button {
	color: inherit;
	font-size: inherit;
	text-decoration: underline;
}

.credentials-host__button {
	padding: 0;
	border: none;
	background: transparent;
	cursor: pointer;
	font-family: inherit;
}
</style>
