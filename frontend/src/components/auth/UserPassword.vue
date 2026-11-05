<script setup lang="ts">
// Port of frontend/src/app/components/ui-components/user-password: a new-password field (required,
// at least 8 characters, passwordValidator's upper/lower/number rules) with a show/hide toggle and
// the zxcvbn strength meter under it. `v-model` replaces `[value]` + `(onFieldChange)`.
//
// The rules reach the enclosing <form> through native validity (`required`, `minlength` and
// v-custom-validity), so a view can read `form.checkValidity()` or its own `passwordErrors` check.
// The unmet rules are shown once the field has been left, where Angular only turned it red.
import { computed, ref } from 'vue';
import { UiField, UiIconButton, UiInput } from '@/components/ui';
import { vCustomValidity } from '@/directives/customValidity';
import { passwordValidation } from '@/validators/password.validator';
import { trackAuthEvent } from './analytics';
import PasswordStrength from './PasswordStrength.vue';

const props = withDefaults(
	defineProps<{
		modelValue?: string;
		label: string;
	}>(),
	{ modelValue: '' },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const rule = passwordValidation();
const passwordShown = ref(false);
const touched = ref(false);

const validityMessage = computed(() => {
	const result = rule(props.modelValue);
	return result === true ? '' : result;
});

const error = computed(() => (touched.value ? validityMessage.value || undefined : undefined));

function onChange() {
	trackAuthEvent('Reg: password is changed');
}
</script>

<template>
	<div class="user-password">
		<UiField :label="label" :error="error" required>
			<div class="user-password__control">
				<UiInput
					v-custom-validity="validityMessage"
					:type="passwordShown ? 'text' : 'password'"
					name="password"
					minlength="8"
					autocomplete="new-password"
					class="user-password__input"
					:model-value="modelValue"
					@update:model-value="emit('update:modelValue', $event)"
					@change="onChange"
					@blur="touched = true"
				/>
				<UiIconButton
					:icon="passwordShown ? 'visibility_off' : 'visibility'"
					:label="passwordShown ? 'Hide password' : 'Show password'"
					size="sm"
					class="user-password__toggle"
					@click="passwordShown = !passwordShown"
				/>
			</div>
		</UiField>
		<PasswordStrength :password="modelValue" />
	</div>
</template>

<style scoped>
.user-password {
	width: 100%;
}

.user-password__control {
	position: relative;
}

/* Two classes so it outranks UiInput's own padding regardless of stylesheet order. */
.user-password__control > .user-password__input {
	padding-inline-end: var(--space-10);
}

.user-password__toggle {
	position: absolute;
	inset-block-start: 50%;
	inset-inline-end: var(--space-1);
	transform: translateY(-50%);
}
</style>
