<script setup lang="ts">
// Port of connect-db/db-credentials-forms/mssql-credentials-form: the SQL fields with a required
// schema, and Azure's "Encryption" switch after the SSL settings.
import { UiCheckbox } from '@/components/ui';
import CredentialsAdvancedSettings from './CredentialsAdvancedSettings.vue';
import CredentialsHostField from './CredentialsHostField.vue';
import CredentialsPasswordField from './CredentialsPasswordField.vue';
import CredentialsTextField from './CredentialsTextField.vue';
import { type CredentialsFormEmits, type CredentialsFormProps, provideCredentialsForm } from './credentialsForm';
import { DATABASE_FIELD, PORT_FIELD, SCHEMA_FIELD, USERNAME_FIELD } from './fieldPresets';

const props = defineProps<CredentialsFormProps>();
const emit = defineEmits<CredentialsFormEmits>();

const form = provideCredentialsForm(props, emit);

function setAzureEncryption(value: boolean) {
	form.connection.value.azure_encryption = value;
	form.track('azure encryption is switched', { enable: value });
}
</script>

<template>
	<CredentialsHostField example="my-test-db.cvfuxe8nltiq.azure.com" />
	<CredentialsTextField v-bind="PORT_FIELD" />
	<CredentialsTextField v-bind="USERNAME_FIELD" />
	<CredentialsPasswordField />
	<CredentialsTextField v-bind="DATABASE_FIELD" label="Database name" :span="2" />
	<CredentialsTextField v-bind="SCHEMA_FIELD" required />
	<CredentialsAdvancedSettings>
		<UiCheckbox
			class="mssql-credentials__encryption"
			name="azureEncryption"
			data-testid="connection-ssl-encryption-checkbox"
			:model-value="connection.azure_encryption"
			:disabled="submitting"
			@update:model-value="setAzureEncryption"
		>
			Encryption
		</UiCheckbox>
	</CredentialsAdvancedSettings>
</template>

<style scoped>
.mssql-credentials__encryption {
	grid-column: 1 / -1;
	margin-bottom: var(--space-4);
}
</style>
