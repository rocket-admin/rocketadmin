<script setup lang="ts">
// Port of connect-db/db-credentials-forms/clickhouse-credentials-form.
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
	<CredentialsHostField example="my-test-db.eu-west-2.aws.clickhouse.cloud" />
	<CredentialsTextField v-bind="PORT_FIELD" />
	<CredentialsTextField v-bind="USERNAME_FIELD" />
	<CredentialsPasswordField />
	<CredentialsTextField v-bind="DATABASE_FIELD" />
	<CredentialsAdvancedSettings />
</template>
