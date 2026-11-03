<script setup lang="ts">
// Port of connect-db/db-credentials-forms/cassandra-credentials-form.
import CredentialsAdvancedSettings from './CredentialsAdvancedSettings.vue';
import CredentialsHostField from './CredentialsHostField.vue';
import CredentialsPasswordField from './CredentialsPasswordField.vue';
import CredentialsTextField from './CredentialsTextField.vue';
import { type CredentialsFormEmits, type CredentialsFormProps, provideCredentialsForm } from './credentialsForm';
import { DATABASE_FIELD, PORT_FIELD, USERNAME_FIELD } from './fieldPresets';

const props = defineProps<CredentialsFormProps>();
const emit = defineEmits<CredentialsFormEmits>();

provideCredentialsForm(props, emit, { periods: true });
</script>

<template>
	<CredentialsHostField example="cassandra.us-west-1.amazonaws.com" />
	<CredentialsTextField v-bind="PORT_FIELD" />
	<CredentialsTextField v-bind="USERNAME_FIELD" />
	<CredentialsPasswordField />
	<CredentialsTextField v-bind="DATABASE_FIELD" label="Database name" :span="2" />
	<CredentialsTextField
		field="dataCenter"
		label="Data center"
		event="database dataCenter"
		:span="2"
		testid="connection-data-center-input"
	/>
	<CredentialsAdvancedSettings sensitive-placeholder="Sensitive — write only field" />
</template>
