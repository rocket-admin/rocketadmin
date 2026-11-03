<script setup lang="ts">
// The Password field: required for a new connection, and for a saved one once the hostname (or the
// port) was touched; a saved connection otherwise keeps its password when this is left blank.
import { computed } from 'vue';
import CredentialsTextField from './CredentialsTextField.vue';
import { useCredentialsForm } from './credentialsForm';

const props = withDefaults(
	defineProps<{
		span?: 1 | 2 | 3 | 'full';
		/** DynamoDB has no port field, so only the hostname counts. */
		watchPort?: boolean;
	}>(),
	{ span: 2, watchPort: true },
);

const form = useCredentialsForm();

const changed = (check: (name: string) => boolean) => check('hostname') || (props.watchPort && check('port'));

const required = computed(() => !form.connection.value.id || changed(form.isTouched));

const hint = computed(() => {
	if (!form.connection.value.id) return undefined;
	return changed(form.isDirty)
		? form.sentence('Password needed due to hostname/port change')
		: form.sentence('To keep password the same keep this field blank');
});
</script>

<template>
	<CredentialsTextField
		field="password"
		type="password"
		label="Password"
		event="password"
		autofill="password"
		testid="connection-password-input"
		:span="span"
		:required="required"
		:hint="hint"
	/>
</template>
