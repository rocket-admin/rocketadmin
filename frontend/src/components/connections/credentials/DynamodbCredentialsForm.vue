<script setup lang="ts">
// Port of connect-db/db-credentials-forms/dynamodb-credentials-form: an https:// endpoint and the
// access key pair; no port, SSH or SSL.
import CredentialsAdvancedSettings from './CredentialsAdvancedSettings.vue';
import CredentialsHostField from './CredentialsHostField.vue';
import CredentialsPasswordField from './CredentialsPasswordField.vue';
import CredentialsTextField from './CredentialsTextField.vue';
import { type CredentialsFormEmits, type CredentialsFormProps, provideCredentialsForm } from './credentialsForm';
import { USERNAME_FIELD } from './fieldPresets';

const props = defineProps<CredentialsFormProps>();
const emit = defineEmits<CredentialsFormEmits>();

provideCredentialsForm(props, emit);
</script>

<template>
	<CredentialsHostField example="https://dynamodb.us-east-2.amazonaws.com" note="" span="full" validation="dynamodb">
		<template #help>
			<p class="dynamodb-credentials__help">
				Select the endpoint matching your database region from the
				<a
					href="https://docs.aws.amazon.com/general/latest/gr/ddb.html#ddb_region"
					target="_blank"
					rel="noopener"
					class="dynamodb-credentials__link"
				>AWS DynamoDB endpoints list</a>
			</p>
		</template>
	</CredentialsHostField>
	<CredentialsTextField v-bind="USERNAME_FIELD" />
	<CredentialsPasswordField :watch-port="false" />
	<CredentialsAdvancedSettings :ssh="false" :ssl="false" />
</template>

<style scoped>
.dynamodb-credentials__help {
	margin: var(--space-1) 0 0;
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.dynamodb-credentials__link {
	color: inherit;
}
</style>
