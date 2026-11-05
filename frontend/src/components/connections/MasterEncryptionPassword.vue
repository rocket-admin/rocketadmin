<script setup lang="ts">
// Port of connect-db/master-encryption-password: the "Use client-side encryption" switch. Turning it
// on generates a random master password, shows it (readonly, with a copy button) and the warning
// that Rocketadmin does not store it.
import { ref, watch } from 'vue';
import { UiField, UiIconButton, UiInput, UiSwitch } from '@/components/ui';
import { copyToClipboard } from '@/lib/clipboard';
import { useNotificationsStore } from '@/stores/notifications';
import { trackConnectionEvent } from './analytics';

const props = withDefaults(
	defineProps<{
		masterKey?: string | null;
		/** Initial switch state: whether the connection already uses client-side encryption. */
		enabled?: boolean;
		disabled?: boolean;
	}>(),
	{ masterKey: null, enabled: false, disabled: false },
);

const emit = defineEmits<{ masterKeyChange: [key: string] }>();

const notifications = useNotificationsStore();
const isMasterKeyTurnedOn = ref(props.enabled);
const key = ref(props.masterKey ?? '');

watch(
	() => props.masterKey,
	(value) => {
		key.value = value ?? '';
	},
);

function onToggle(checked: boolean) {
	isMasterKeyTurnedOn.value = checked;
	trackConnectionEvent('Connection creds: client-side encryption is switched', { enable: checked }, undefined);
	if (checked) {
		key.value = generateMasterKey();
		emit('masterKeyChange', key.value);
	}
}

async function copyKey() {
	if (await copyToClipboard(key.value)) notifications.showSuccessSnackbar('Master password was copied to clipboard.');
}

function generateMasterKey(): string {
	const randomArray = new Uint8Array(32);
	window.crypto.getRandomValues(randomArray);
	return btoa(String.fromCharCode(...randomArray));
}
</script>

<template>
	<div class="master-encryption">
		<UiSwitch
			name="encryption"
			data-testid="connection-master-encryption-toggle"
			:model-value="isMasterKeyTurnedOn"
			:disabled="disabled"
			@update:model-value="onToggle"
		>
			Use client-side encryption
		</UiSwitch>

		<div v-if="isMasterKeyTurnedOn && key" class="master-encryption__password">
			<div class="master-encryption__field">
				<UiField label="Master password" class="master-encryption__input">
					<UiInput v-model="key" name="masterPassword" data-testid="connection-master-password-input" readonly />
				</UiField>
				<UiIconButton
					icon="content_copy"
					label="Copy master password"
					data-testid="connection-master-password-copy-button"
					class="master-encryption__copy"
					@click="copyKey"
				/>
			</div>

			<div class="master-encryption__notice">
				<p class="master-encryption__warning">
					Rocketadmin will not store your master password.
					<br>
					To retain access, store it in a safe place.
					<br>
					Share it only with users you want to have access to this connection.
				</p>
				<a href="https://docs.rocketadmin.com/Reference/MasterPassword" target="_blank" rel="noopener" class="master-encryption__docs">
					Open docs
				</a>
			</div>
		</div>
	</div>
</template>

<style scoped>
.master-encryption {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	margin-bottom: var(--space-5);
}

.master-encryption__password {
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
	margin-top: var(--space-6);
	width: 100%;
}

.master-encryption__field {
	display: flex;
	align-items: flex-end;
	gap: var(--space-2);
	width: 100%;
}

.master-encryption__input {
	flex-grow: 1;
}

.master-encryption__notice {
	padding: var(--space-4) var(--space-3);
	border-left: var(--space-3) solid var(--color-warning);
	background-color: var(--color-warning-bg);
	color: var(--color-ink);
}

.master-encryption__warning {
	margin: 0 0 var(--space-2);
	line-height: var(--leading-relaxed);
}

.master-encryption__docs {
	color: var(--color-warning);
	font-weight: var(--weight-medium);
	text-decoration: none;
}
</style>
