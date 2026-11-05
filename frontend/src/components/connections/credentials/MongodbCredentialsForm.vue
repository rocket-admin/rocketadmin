<script setup lang="ts">
// Port of connect-db/db-credentials-forms/mongodb-credentials-form.
import CredentialsAdvancedSettings from './CredentialsAdvancedSettings.vue';
import CredentialsHostField from './CredentialsHostField.vue';
import CredentialsPasswordField from './CredentialsPasswordField.vue';
import CredentialsTextField from './CredentialsTextField.vue';
import { type CredentialsFormEmits, type CredentialsFormProps, provideCredentialsForm } from './credentialsForm';
import { DATABASE_FIELD, PORT_FIELD, USERNAME_FIELD } from './fieldPresets';

const props = defineProps<CredentialsFormProps>();
const emit = defineEmits<CredentialsFormEmits>();

provideCredentialsForm(props, emit);
</script>

<template>
	<CredentialsHostField example="mongodb+srv://my-test-db.8a8grvb.mongoconnection.net" validation="mongodb" />
	<CredentialsTextField v-bind="PORT_FIELD" />
	<CredentialsTextField v-bind="USERNAME_FIELD" />
	<CredentialsPasswordField />
	<CredentialsTextField v-bind="DATABASE_FIELD" label="Database name" :span="2" />
	<CredentialsTextField
		field="authSource"
		name="authsource"
		label="Authentication database"
		event="database authSource"
		:span="2"
		autofill="authSource"
		:clear-autofill="false"
		testid="connection-auth-source-input"
	/>
	<CredentialsAdvancedSettings />
</template>
