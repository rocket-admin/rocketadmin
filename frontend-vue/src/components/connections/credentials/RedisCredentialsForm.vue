<script setup lang="ts">
// Port of connect-db/db-credentials-forms/redis-credentials-form.
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
	<CredentialsHostField example="redis-12345.c17.us-east-1-2.ec2.cloud.redislabs.com" />
	<CredentialsTextField v-bind="PORT_FIELD" />
	<CredentialsPasswordField span="full" />
	<CredentialsAdvancedSettings :ssl-cert-required="false">
		<template #top>
			<CredentialsTextField v-bind="USERNAME_FIELD" span="full" :required="false" />
			<CredentialsTextField v-bind="DATABASE_FIELD" label="Database name" :required="false" />
		</template>
	</CredentialsAdvancedSettings>
</template>
