<script setup lang="ts">
// Port of frontend/src/app/components/secrets (/secrets): the company's secrets vault — a searchable,
// paged list of secrets with their encryption and expiry, and the create / edit / audit log / delete
// dialogs. The dialogs change secrets through the secrets store, which reloads the page on screen
// (Angular's `secrets.cast` subscription).
import { computed, onMounted, onUnmounted, ref } from 'vue';
import ProfileLayout from '@/components/profile/ProfileLayout.vue';
import CreateSecretDialog from '@/components/secrets/CreateSecretDialog.vue';
import DeleteSecretDialog from '@/components/secrets/DeleteSecretDialog.vue';
import EditSecretDialog from '@/components/secrets/EditSecretDialog.vue';
import SecretAuditLogDialog from '@/components/secrets/SecretAuditLogDialog.vue';
import {
	formatMediumDate,
	formatMediumDateTime,
	isExpired,
	isExpiringSoon,
	trackSecretsEvent,
} from '@/components/secrets/secretUtils';
import PlaceholderTableData from '@/components/skeletons/PlaceholderTableData.vue';
import {
	type PageEvent,
	type TableColumn,
	UiButton,
	UiDivider,
	UiField,
	UiIcon,
	UiIconButton,
	UiInput,
	UiMenu,
	UiMenuItem,
	UiPaginator,
	UiTable,
	vTooltip,
} from '@/components/ui';
import { useDialog } from '@/composables/useDialog';
import type { Secret } from '@/models/secret';
import { useSecretsStore } from '@/stores/secrets';

const SEARCH_DEBOUNCE_MS = 300;

const columns: TableColumn<Secret>[] = [
	{ key: 'slug', label: 'Unique Identifier' },
	{ key: 'masterEncryption', label: 'Encryption' },
	{ key: 'expiresAt', label: 'Expires' },
	{ key: 'updatedAt', label: 'Last Updated' },
];

const secretsStore = useSecretsStore();
const dialog = useDialog();

const page = ref(1);
const perPage = ref(20);
const searchQuery = ref('');
// True until the first page arrives, like Angular's `loading = true`; the store's own flag covers
// the reloads after a dialog changed something.
const loadingFirstPage = ref(true);

const loading = computed(() => loadingFirstPage.value || secretsStore.loading);
const secrets = computed(() => secretsStore.secrets);
const total = computed(() => secretsStore.pagination?.total ?? 0);

let searchTimer: ReturnType<typeof setTimeout> | undefined;
/** The last debounced query, for `distinctUntilChanged`; nothing emitted yet. */
let lastSearched: string | undefined;

onMounted(loadSecrets);

onUnmounted(() => clearTimeout(searchTimer));

async function loadSecrets() {
	try {
		const response = await secretsStore.fetchSecrets(page.value, perPage.value, searchQuery.value || undefined);
		page.value = response.pagination.currentPage;
		perPage.value = response.pagination.perPage;
	} catch {
		// The store has shown the error.
	} finally {
		loadingFirstPage.value = false;
	}
}

function onSearchChange(query: string) {
	searchQuery.value = query;
	clearTimeout(searchTimer);
	searchTimer = setTimeout(() => {
		if (query === lastSearched) return;
		lastSearched = query;
		page.value = 1;
		loadSecrets();
	}, SEARCH_DEBOUNCE_MS);
}

function onPageChange(event: PageEvent) {
	page.value = event.pageIndex + 1;
	perPage.value = event.pageSize;
	loadSecrets();
}

function openCreateDialog() {
	dialog.open(CreateSecretDialog);
	trackSecretsEvent('Secrets: create secret dialog opened');
}

function openEditDialog(secret: Secret) {
	dialog.open(EditSecretDialog, { data: { secret } });
	trackSecretsEvent('Secrets: edit secret dialog opened');
}

function openDeleteDialog(secret: Secret) {
	dialog.open(DeleteSecretDialog, { data: { secret } });
	trackSecretsEvent('Secrets: delete secret dialog opened');
}

function openAuditLogDialog(secret: Secret) {
	dialog.open(SecretAuditLogDialog, { data: { secret } });
	trackSecretsEvent('Secrets: audit log dialog opened');
}
</script>

<template>
	<ProfileLayout active-tab="secrets">
		<div class="secrets">
			<header class="secrets__header">
				<h1 class="secrets__title">Company Secrets</h1>
				<p class="secrets__description">
					Securely store and manage sensitive information like API keys, passwords, and tokens.
				</p>
			</header>

			<div class="secrets__toolbar">
				<UiField label="Search secrets" class="secrets__search">
					<div class="secrets__search-control">
						<UiInput
							:model-value="searchQuery"
							type="search"
							name="search"
							placeholder="Search by unique identifier..."
							class="secrets__search-input"
							data-testid="secrets-search-input"
							@update:model-value="onSearchChange"
						/>
						<UiIcon name="search" size="sm" class="secrets__search-icon" />
					</div>
				</UiField>

				<UiButton data-testid="create-secret-button" @click="openCreateDialog">
					<template #leading><UiIcon name="add" size="sm" /></template>
					Create Secret
				</UiButton>
			</div>

			<PlaceholderTableData v-if="loading" label="Loading secrets" />

			<div v-else-if="secrets.length === 0" class="secrets__empty" data-testid="secrets-empty">
				<UiIcon name="key_off" size="lg" class="secrets__empty-icon" />
				<h3 class="secrets__empty-title">No secrets found</h3>
				<p v-if="searchQuery" class="secrets__empty-text">No secrets match your search criteria.</p>
				<template v-else>
					<p class="secrets__empty-text">Create your first secret to securely store sensitive data.</p>
					<UiButton variant="secondary" data-testid="secrets-empty-create-button" @click="openCreateDialog">
						<template #leading><UiIcon name="add" size="sm" /></template>
						Create Secret
					</UiButton>
				</template>
			</div>

			<template v-else>
				<UiTable
					:columns="columns"
					:rows="secrets"
					row-key="id"
					label="Secrets"
					actions-label=""
					class="secrets__table"
				>
					<template #cell-slug="{ row, index }">
						<span class="secrets__slug" :data-testid="`secret-slug-${index}-cell`">{{ row.slug }}</span>
					</template>

					<template #cell-masterEncryption="{ row, index }">
						<span
							v-if="row.masterEncryption"
							v-tooltip="'Protected with master password'"
							class="secrets__encryption secrets__encryption--master"
							:data-testid="`secret-encryption-${index}-cell`"
						>
							<UiIcon name="enhanced_encryption" label="Protected with master password" />
						</span>
						<span
							v-else
							v-tooltip="'Standard encryption'"
							class="secrets__encryption"
							:data-testid="`secret-encryption-${index}-cell`"
						>
							<UiIcon name="lock" label="Standard encryption" />
						</span>
					</template>

					<template #cell-expiresAt="{ row, index }">
						<span :data-testid="`secret-expires-${index}-cell`">
							<span v-if="!row.expiresAt" class="secrets__no-expiry">Never</span>
							<span v-else-if="isExpired(row)" class="secrets__badge secrets__badge--expired">
								<UiIcon name="error" size="sm" />
								Expired
							</span>
							<span v-else-if="isExpiringSoon(row)" class="secrets__badge secrets__badge--expiring">
								<UiIcon name="warning" size="sm" />
								{{ formatMediumDate(row.expiresAt) }}
							</span>
							<span v-else>{{ formatMediumDate(row.expiresAt) }}</span>
						</span>
					</template>

					<template #cell-updatedAt="{ row, index }">
						<span :data-testid="`secret-updated-${index}-cell`">{{ formatMediumDateTime(row.updatedAt) }}</span>
					</template>

					<template #actions="{ row, index }">
						<UiMenu :label="`Actions for ${row.slug}`" align="end">
							<template #trigger="{ triggerProps }">
								<UiIconButton
									v-bind="triggerProps"
									icon="more_vert"
									:label="`Actions for ${row.slug}`"
									:data-testid="`secret-actions-${index}-button`"
								/>
							</template>
							<UiMenuItem
								icon="edit"
								:disabled="isExpired(row)"
								:data-testid="`secret-edit-${index}-menu-item`"
								@select="openEditDialog(row)"
							>
								Edit
							</UiMenuItem>
							<UiMenuItem
								icon="history"
								:data-testid="`secret-audit-${index}-menu-item`"
								@select="openAuditLogDialog(row)"
							>
								Audit Log
							</UiMenuItem>
							<UiDivider />
							<UiMenuItem
								icon="delete"
								variant="danger"
								:data-testid="`secret-delete-${index}-menu-item`"
								@select="openDeleteDialog(row)"
							>
								Delete
							</UiMenuItem>
						</UiMenu>
					</template>
				</UiTable>

				<UiPaginator
					:length="total"
					:page-index="page - 1"
					:page-size="perPage"
					:page-size-options="[10, 20, 50]"
					label="Secrets pages"
					data-testid="secrets-paginator"
					@page="onPageChange"
				/>
			</template>
		</div>
	</ProfileLayout>
</template>

<style scoped>
.secrets {
	max-width: 1200px;
	margin: var(--space-8) auto;
	padding: 0 clamp(var(--space-10), 5vw, 100px);
}

.secrets__header {
	margin-bottom: var(--space-8);
}

.secrets__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-2xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.secrets__description {
	margin: var(--space-2) 0 0;
	color: var(--color-muted);
}

.secrets__toolbar {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--space-4);
	margin-bottom: var(--space-6);
}

.secrets__search {
	flex: 1;
	max-width: 400px;
}

.secrets__search-control {
	position: relative;
}

.secrets__search-control > .secrets__search-input {
	padding-inline-end: var(--space-10);
}

.secrets__search-icon {
	position: absolute;
	inset-block-start: 50%;
	inset-inline-end: var(--space-3);
	transform: translateY(-50%);
	color: var(--color-muted);
	pointer-events: none;
}

.secrets__table {
	margin-bottom: var(--space-4);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-card);
}

.secrets__slug {
	font-weight: var(--weight-medium);
	overflow-wrap: anywhere;
}

.secrets__encryption {
	display: inline-flex;
	color: var(--color-muted);
}

.secrets__encryption--master {
	color: var(--color-accent);
}

.secrets__no-expiry {
	color: var(--color-muted);
}

.secrets__badge {
	display: inline-flex;
	align-items: center;
	gap: var(--space-1);
	font-weight: var(--weight-medium);
}

.secrets__badge--expired {
	color: var(--color-danger);
}

.secrets__badge--expiring {
	color: var(--color-warning);
}

.secrets__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--space-16) var(--space-6);
	text-align: center;
	border-radius: var(--radius-card);
	background: var(--color-paper-2);
}

.secrets__empty-icon {
	margin-bottom: var(--space-4);
	color: var(--color-muted-soft);
}

.secrets__empty-title {
	margin: 0 0 var(--space-2);
	font-size: var(--text-md);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.secrets__empty-text {
	margin: 0 0 var(--space-4);
	color: var(--color-muted);
}

@media (width <= 600px) {
	.secrets {
		margin: var(--space-6) auto;
		padding: 0 var(--space-4);
	}

	.secrets__toolbar {
		flex-direction: column;
		align-items: stretch;
	}

	.secrets__search {
		max-width: 100%;
	}

	/* Each row becomes a card of "label value" lines, as in Angular. */
	.secrets__table :deep(.ui-table__head) {
		display: none;
	}

	.secrets__table :deep(.ui-table__table),
	.secrets__table :deep(.ui-table__body),
	.secrets__table :deep(.ui-table__body tr) {
		display: block;
	}

	.secrets__table :deep(.ui-table__body tr) {
		padding: var(--space-4) 0;
		border-bottom: 1px solid var(--color-line);
	}

	.secrets__table :deep(.ui-table__body .ui-table__cell) {
		display: grid;
		grid-template-columns: 9rem 1fr;
		gap: var(--space-3);
		border-bottom: none;
	}

	.secrets__table :deep(.ui-table__body .ui-table__cell[data-label])::before {
		content: attr(data-label);
		font-weight: var(--weight-bold);
		white-space: nowrap;
	}

	.secrets__table :deep(.ui-table__body .ui-table__actions-cell) {
		display: flex;
		justify-content: flex-end;
		position: static;
	}
}
</style>
