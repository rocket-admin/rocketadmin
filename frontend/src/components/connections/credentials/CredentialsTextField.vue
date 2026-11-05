<script setup lang="ts">
// A text, number, password or multi-line field bound to one connection property, with the
// credentials forms' common behaviour: readonly / disabled rules, touched and dirty tracking, the
// "should not be empty" error, the autofilled look and the "<field> is edited" analytics event.
import { computed } from 'vue';
import { UiInput, UiTextarea } from '@/components/ui';
import CredentialsField from './CredentialsField.vue';
import { type CredentialsTextKey, useCredentialsForm } from './credentialsForm';

const props = withDefaults(
	defineProps<{
		field: CredentialsTextKey;
		label: string;
		/** Analytics wording: "Connection creds add: <event> is edited". */
		event: string;
		/** Native `name`; also the key of the touched/dirty state. Defaults to `field`. */
		name?: string;
		span?: 1 | 2 | 3 | 'full';
		type?: 'text' | 'number' | 'password';
		/** Eight-row textarea (SSH key, SSL certificate). */
		multiline?: boolean;
		required?: boolean;
		/** Shown when the required field is left empty. */
		requiredError?: string;
		hint?: string;
		placeholder?: string;
		/** Autofilled-from-connection-string key this field shows the look for. */
		autofill?: string;
		/** Whether editing the field clears its autofilled state (MongoDB's auth database does not). */
		clearAutofill?: boolean;
		/** SSH/SSL fields follow the access level only, not the test-connection rule. */
		ssh?: boolean;
		testid?: string;
	}>(),
	{ span: 'full', type: 'text', multiline: false, required: false, clearAutofill: true, ssh: false },
);

const form = useCredentialsForm();

const key = computed(() => props.name ?? props.field);
const value = computed({
	get: () => form.getText(props.field),
	set: (next: string) => form.setText(props.field, next),
});
const readonly = computed(() => (props.ssh ? form.sshReadonly.value : Boolean(form.props.readonly)));

const error = computed(() => {
	if (!props.required || !props.requiredError || value.value) return undefined;
	return form.showErrors(key.value) ? form.sentence(props.requiredError) : undefined;
});

function onInput() {
	form.markDirty(key.value);
}

function onChange() {
	form.track(`${props.event} is edited`);
	if (props.autofill && props.clearAutofill) form.clearAutoFilled(props.autofill);
}
</script>

<template>
	<CredentialsField
		:label="label"
		:span="span"
		:hint="hint"
		:error="error"
		:required="required"
		:autofilled="autofill ? form.isAutoFilled(autofill) : false"
	>
		<UiTextarea
			v-if="multiline"
			v-model="value"
			:name="key"
			:rows="8"
			:placeholder="placeholder"
			:readonly="readonly"
			:disabled="form.props.submitting"
			:data-testid="testid"
			mono
			@input="onInput"
			@blur="form.touch(key)"
			@change="onChange"
		/>
		<UiInput
			v-else
			v-model="value"
			:type="type"
			:name="key"
			:placeholder="placeholder"
			:readonly="readonly"
			:disabled="form.props.submitting"
			:data-testid="testid"
			@input="onInput"
			@blur="form.touch(key)"
			@change="onChange"
		/>
	</CredentialsField>
</template>
