<script setup lang="ts">
// Port of connect-db/db-credentials-forms/oracledb-credentials-form.
import CredentialsAdvancedSettings from './CredentialsAdvancedSettings.vue';
import CredentialsHostField from './CredentialsHostField.vue';
import CredentialsPasswordField from './CredentialsPasswordField.vue';
import CredentialsTextField from './CredentialsTextField.vue';
import { type CredentialsFormEmits, type CredentialsFormProps, provideCredentialsForm } from './credentialsForm';
import { DATABASE_FIELD, PORT_FIELD, SCHEMA_FIELD, USERNAME_FIELD } from './fieldPresets';

const props = defineProps<CredentialsFormProps>();
const emit = defineEmits<CredentialsFormEmits>();

provideCredentialsForm(props, emit);
</script>

<template>
	<CredentialsHostField example="my-test-db.cvfuxe8nltiq.us-east-2.rds.amazonaws.com" />
	<CredentialsTextField v-bind="PORT_FIELD" />
	<CredentialsTextField v-bind="USERNAME_FIELD" />
	<CredentialsPasswordField />
	<CredentialsTextField v-bind="DATABASE_FIELD" :span="2" />
	<CredentialsTextField v-bind="SCHEMA_FIELD" />
	<CredentialsAdvancedSettings>
		<template #top>
			<CredentialsTextField field="sid" label="SID" event="SID" testid="connection-sid-input" />
		</template>
	</CredentialsAdvancedSettings>
</template>
