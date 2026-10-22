<script setup lang="ts">
// The forms' "Advanced settings" panel: client-side encryption, then (per database) the SSH tunnel
// and the SSL certificate. `top` holds fields shown right after the encryption switch (Oracle's SID,
// Redis' username), the default slot fields after SSL (SQL Server's encryption).
import { computed } from 'vue';
import { UiCheckbox, UiExpansionPanel } from '@/components/ui';
import MasterEncryptionPassword from '../MasterEncryptionPassword.vue';
import CredentialsTextField from './CredentialsTextField.vue';
import { useCredentialsForm } from './credentialsForm';

const props = withDefaults(
	defineProps<{
		/** Offer the SSH tunnel settings. */
		ssh?: boolean;
		/** Offer the SSL certificate settings. */
		ssl?: boolean;
		/** Whether the certificate is required once SSL is on. */
		sslCertRequired?: boolean;
		/** Placeholder of the write-only SSH fields. */
		sensitivePlaceholder?: string;
	}>(),
	{ ssh: true, ssl: true, sslCertRequired: true, sensitivePlaceholder: 'Sensitive — write-only field' },
);

const form = useCredentialsForm();
const connection = form.connection;

const masterKeyDisabled = computed(
	() =>
		form.props.accessLevel === 'readonly' ||
		Boolean(form.props.submitting) ||
		Boolean(connection.value.isTestConnection),
);
const toggleDisabled = computed(() => Boolean(form.props.submitting) || Boolean(connection.value.isTestConnection));

function setSsh(value: boolean) {
	connection.value.ssh = value;
	form.track('SSH is switched', { enable: value });
}

function setSsl(value: boolean) {
	connection.value.ssl = value;
	form.track('SSL is switched', { enable: value });
}
</script>

<template>
	<UiExpansionPanel
		title="Advanced settings"
		class="credentials-advanced"
		data-testid="connection-advanced-settings-expansion-panel-header"
	>
		<div class="credentials-advanced__grid">
			<MasterEncryptionPassword
				class="credentials-advanced__full"
				:master-key="form.props.masterKey"
				:enabled="connection.masterEncryption"
				:disabled="masterKeyDisabled"
				@master-key-change="form.setMasterKey"
			/>

			<slot name="top" />

			<template v-if="props.ssh">
				<UiCheckbox
					class="credentials-advanced__full credentials-advanced__checkbox"
					name="ssh"
					data-testid="connection-ssh-checkbox"
					:model-value="connection.ssh"
					:disabled="toggleDisabled"
					@update:model-value="setSsh"
				>
					Use SSH tunnel
				</UiCheckbox>

				<template v-if="connection.ssh">
					<CredentialsTextField
						field="privateSSHKey"
						label="Private SSH key"
						event="SSH key"
						multiline
						ssh
						testid="connection-ssh-key-textarea"
						:placeholder="sensitivePlaceholder"
						:required="!connection.id"
						required-error="Private SSH key should not be empty"
					/>
					<CredentialsTextField
						field="sshHost"
						label="SSH host"
						event="SSH host"
						:span="1"
						ssh
						testid="connection-ssh-host-input"
						required
						required-error="SSH host should not be empty"
					/>
					<CredentialsTextField
						field="sshPort"
						type="number"
						label="SSH port"
						event="SSH port"
						:span="1"
						ssh
						testid="connection-ssh-port-input"
						required
						required-error="SSH port should not be empty"
					/>
					<CredentialsTextField
						field="sshUsername"
						label="SSH username"
						event="SSH username"
						:span="1"
						ssh
						testid="connection-ssh-username-input"
						:placeholder="sensitivePlaceholder"
						required
						required-error="SSH username should not be empty"
					/>
				</template>
			</template>

			<template v-if="props.ssl">
				<UiCheckbox
					class="credentials-advanced__full credentials-advanced__checkbox"
					name="ssl"
					data-testid="connection-ssl-checkbox"
					:model-value="connection.ssl"
					:disabled="toggleDisabled"
					@update:model-value="setSsl"
				>
					Check SSL certificate
				</UiCheckbox>

				<CredentialsTextField
					v-if="connection.ssl"
					field="cert"
					name="sslCert"
					label="SSL certificate"
					event="SSL certificate"
					multiline
					ssh
					testid="connection-ssl-certificate-textarea"
					:required="sslCertRequired"
					required-error="SSL certificate should not be empty"
				/>
			</template>

			<slot />
		</div>
	</UiExpansionPanel>
</template>

<style scoped>
.credentials-advanced {
	grid-column: 1 / -1;
}

.credentials-advanced__grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--space-1) var(--space-6);
}

.credentials-advanced__grid > :deep(*) {
	min-width: 0;
}

.credentials-advanced__full {
	grid-column: 1 / -1;
}

.credentials-advanced__checkbox {
	margin-bottom: var(--space-4);
}

@media (width <= 600px) {
	.credentials-advanced__grid {
		display: flex;
		flex-direction: column;
	}
}
</style>
