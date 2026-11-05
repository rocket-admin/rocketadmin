<script setup lang="ts">
// Port of ui-components/ip-address-button: an inline, monospace IP address that copies itself.
//
// Kept as in Angular: whatever `ip` shows, the button copies Rocketadmin's `18.221.81.73/32`.
import { copyToClipboard } from '@/lib/clipboard';
import { useNotificationsStore } from '@/stores/notifications';

const props = withDefaults(
	defineProps<{
		/** The address shown (and named in the "copied" message). */
		ip?: string;
	}>(),
	{ ip: '' },
);

const COPIED_VALUE = '18.221.81.73/32';

const notifications = useNotificationsStore();

async function copy() {
	if (await copyToClipboard(COPIED_VALUE)) {
		notifications.showSuccessSnackbar(`${props.ip} IP address was copied to clipboard.`);
	}
}
</script>

<template>
	<button v-tooltip="'Copy IP address'" type="button" class="app-ip-address-button" @click="copy">
		<strong>{{ ip }}</strong>
	</button>
</template>

<style scoped>
.app-ip-address-button {
	padding: var(--space-05) var(--space-1);
	border: none;
	border-radius: var(--radius-control);
	background: transparent;
	color: inherit;
	font-family: var(--font-mono);
	font-size: inherit;
	cursor: pointer;
}

.app-ip-address-button:hover {
	background: var(--color-paper-2);
}

.app-ip-address-button:focus-visible {
	outline: none;
	box-shadow: var(--shadow-focus);
}
</style>
