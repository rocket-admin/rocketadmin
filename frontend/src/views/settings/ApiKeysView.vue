<script setup lang="ts">
// Port of frontend/src/app/components/api-keys (/api-keys): generate an API key (its secret is
// shown once), list the keys and delete them.
import { onMounted, ref } from 'vue';
import { trackAuthEvent } from '@/components/auth/analytics';
import ProfileLayout from '@/components/profile/ProfileLayout.vue';
import PlaceholderApiKeysList from '@/components/skeletons/PlaceholderApiKeysList.vue';
import { UiButton, UiField, UiIcon, UiIconButton, UiInput } from '@/components/ui';
import ApiKeyDeleteDialog from '@/components/user-settings/ApiKeyDeleteDialog.vue';
import { useDialog } from '@/composables/useDialog';
import { useNotify } from '@/composables/useNotify';
import { copyToClipboard } from '@/lib/clipboard';
import type { ApiKey } from '@/models/user';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const dialog = useDialog();
const notify = useNotify();

/** null while loading. */
const apiKeys = ref<ApiKey[] | null>(null);
const generatingAPIkeyTitle = ref('');
const generatedAPIkeyHash = ref('');
const submitting = ref(false);

onMounted(() => {
	getAPIkeys();
});

async function getAPIkeys() {
	try {
		apiKeys.value = await userStore.getAPIkeys();
	} catch {
		// The store has shown the error.
	}
}

async function generateAPIkey() {
	submitting.value = true;
	try {
		const response = await userStore.generateAPIkey(generatingAPIkeyTitle.value);
		generatedAPIkeyHash.value = response.hash ?? '';
		generatingAPIkeyTitle.value = '';
		getAPIkeys();
		trackAuthEvent('API Keys: key generated successfully');
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}

async function deleteAPIkey(apiKey: ApiKey) {
	const action = await dialog.open<'delete'>(ApiKeyDeleteDialog, { data: apiKey }).afterClosed();
	if (action === 'delete') {
		getAPIkeys();
		trackAuthEvent('API Keys: key deleted successfully');
	}
}

async function copyKey() {
	if (await copyToClipboard(generatedAPIkeyHash.value)) notify.success('API key was copied to clipboard.');
}
</script>

<template>
	<ProfileLayout active-tab="api">
		<div class="api-keys">
			<h1 class="api-keys__title">API Keys</h1>
			<p class="api-keys__description">Generate and manage API keys to access Rocketadmin programmatically.</p>

			<div class="api-keys__content">
				<form class="api-keys__form" novalidate @submit.prevent="generateAPIkey">
					<UiField label="API key title" class="api-keys__form-field">
						<UiInput
							v-model="generatingAPIkeyTitle"
							name="api-key-title"
							data-testid="api-key-input"
							@change="trackAuthEvent('API Keys: api key title is edited')"
						/>
					</UiField>
					<UiButton
						type="submit"
						data-testid="generate-api-key-button"
						:disabled="!generatingAPIkeyTitle || submitting"
					>
						{{ submitting ? 'Generating...' : 'Generate' }}
					</UiButton>
				</form>

				<div v-if="generatedAPIkeyHash" class="api-keys__value">
					<UiField
						label="API key"
						hint="Please save this API key. You won't be able to see it again."
						class="api-keys__form-field"
					>
						<UiInput :model-value="generatedAPIkeyHash" name="token" readonly data-testid="api-key-value-input" />
					</UiField>
					<UiIconButton
						icon="content_copy"
						label="Copy API key"
						data-testid="api-key-value-copy-button"
						class="api-keys__copy"
						@click="copyKey"
					/>
				</div>

				<section class="api-keys__list" aria-labelledby="api-keys-list-heading">
					<h2 id="api-keys-list-heading" class="api-keys__list-heading">Your API keys</h2>

					<PlaceholderApiKeysList v-if="!apiKeys" />

					<div v-else-if="apiKeys.length === 0" class="api-keys__empty">
						<UiIcon name="vpn_key_off" size="lg" class="api-keys__empty-icon" />
						<p class="api-keys__empty-text">You don't have any API keys yet.</p>
					</div>

					<ul v-else class="api-keys__items">
						<li v-for="(apiKey, i) in apiKeys" :key="apiKey.id" class="api-keys__item">
							<span class="api-keys__item-info">
								<UiIcon name="vpn_key" class="api-keys__item-icon" />
								<span class="api-keys__item-title">{{ apiKey.title }}</span>
							</span>
							<UiIconButton
								icon="delete"
								label="Delete API key"
								variant="danger"
								:data-testid="`api-key-${i}-delete-button`"
								@click="deleteAPIkey(apiKey)"
							/>
						</li>
					</ul>
				</section>
			</div>
		</div>
	</ProfileLayout>
</template>

<style scoped>
.api-keys {
	max-width: 800px;
	margin: var(--space-10) auto;
	padding: 0 clamp(var(--space-10), 5vw, 100px);
}

.api-keys__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.api-keys__description {
	margin: var(--space-2) 0 var(--space-8);
	color: var(--color-muted);
}

.api-keys__content {
	display: flex;
	flex-direction: column;
	gap: var(--space-6);
}

.api-keys__form {
	display: flex;
	align-items: flex-end;
	gap: var(--space-4);
}

.api-keys__form-field {
	flex: 1;
}

.api-keys__value {
	display: flex;
	align-items: flex-start;
	gap: var(--space-2);
	padding: var(--space-4);
	border: 1px solid var(--color-success-border);
	border-radius: var(--radius-control);
	background: var(--color-success-bg);
}

.api-keys__copy {
	margin-top: var(--space-6);
}

.api-keys__list {
	margin-top: var(--space-4);
}

.api-keys__list-heading {
	margin: 0 0 var(--space-4);
	font-size: var(--text-md);
	font-weight: var(--weight-medium);
}

.api-keys__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: var(--space-12) var(--space-6);
	border-radius: var(--radius-control);
	background: var(--color-paper-2);
	text-align: center;
}

.api-keys__empty-icon {
	margin-bottom: var(--space-4);
	color: var(--color-muted-soft);
}

.api-keys__empty-text {
	margin: 0;
	color: var(--color-muted);
}

.api-keys__items {
	margin: 0;
	padding: 0;
	list-style: none;
}

.api-keys__item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--space-2);
	padding: var(--space-1) var(--space-4);
	border-radius: var(--radius-control);
}

.api-keys__item:hover {
	background: var(--color-paper-2);
}

.api-keys__item-info {
	display: flex;
	align-items: center;
	gap: var(--space-3);
}

.api-keys__item-icon {
	color: var(--color-muted);
}

.api-keys__item-title {
	font-weight: var(--weight-medium);
}

@media (width <= 600px) {
	.api-keys {
		margin: var(--space-6) auto;
		padding: 0 var(--space-4);
	}

	.api-keys__form {
		flex-direction: column;
		align-items: stretch;
	}
}
</style>
