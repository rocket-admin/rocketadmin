<script setup lang="ts">
// Port of connect-db/db-credentials-forms/elastic-credentials-form.
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
	<CredentialsHostField example="cluster-123456.es.europe-west1.gcp.elastic-cloud.com" />
	<CredentialsTextField v-bind="PORT_FIELD" />
	<CredentialsTextField v-bind="USERNAME_FIELD" />
	<CredentialsPasswordField />
	<CredentialsAdvancedSettings>
		<template #top>
			<!-- As in Angular, the username is offered here a second time (bound to the same value). -->
			<CredentialsTextField v-bind="USERNAME_FIELD" span="full" :required="false" />
			<CredentialsTextField v-bind="DATABASE_FIELD" label="Database name" :required="false" />
		</template>
	</CredentialsAdvancedSettings>
</template>
