<script setup lang="ts">
// Port of frontend/src/app/components/audit (/audit/:connectionId): the connection's audit log,
// paged on the server and filtered by table and by user. Wide screens get a table; at ≤600px the
// same page renders as a feed of cards grouped by day. Either opens AuditInfoDialog for one entry.
import posthog from 'posthog-js';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { isApiError } from '@/api/client';
import AuditInfoDialog from '@/components/audit/AuditInfoDialog.vue';
import { type AuditRow, useAuditLog } from '@/components/audit/useAuditLog';
import AppBanner from '@/components/shared/AppBanner.vue';
import PlaceholderAuditLog from '@/components/skeletons/PlaceholderAuditLog.vue';
import {
	type SelectOption,
	type TableColumn,
	UiButton,
	UiChip,
	UiField,
	UiIcon,
	UiIconButton,
	UiPaginator,
	UiSelect,
	UiTable,
} from '@/components/ui';
import { trackEvent } from '@/composables/useAnalytics';
import { useDialog } from '@/composables/useDialog';
import { environment } from '@/environment';
import { normalizeTableName } from '@/lib/normalize';
import { AlertType } from '@/models/alert';
import type { TableProperties } from '@/models/table';
import { useConnectionsStore } from '@/stores/connections';
import { useTablesStore } from '@/stores/tables';
import { type ConnectionUser, useUsersStore } from '@/stores/users';

interface ServerError {
	abstract: string;
	details?: string;
}

const PAGE_SIZE_OPTIONS = [10, 30, 100, 300];
const MOBILE_QUERY = '(max-width: 600px)';

const route = useRoute();
const connections = useConnectionsStore();
const tables = useTablesStore();
const users = useUsersStore();
const dialog = useDialog();
const { rows, loading, pageIndex, pageSize, length, fetchLogs } = useAuditLog();

const isSaas = environment.saas;
const connectionID = computed(() => String(route.params.connectionId ?? ''));
const accessLevel = computed(() => connections.connectionAccessLevel);

const tablesList = shallowRef<TableProperties[] | null>(null);
const usersList = shallowRef<ConnectionUser[] | null>(null);
const tableName = ref('showAll');
const userEmail = ref('showAll');
const serverError = ref<ServerError | null>(null);
const noTablesError = ref(false);

const columns: TableColumn<AuditRow>[] = [
	{ key: 'User', label: 'User' },
	{ key: 'Table', label: 'Table' },
	{ key: 'Action', label: 'Action' },
	{ key: 'Status', label: 'Status' },
	{ key: 'Date', label: 'Date' },
	{ key: 'Changes', label: 'Changes' },
];

const tableOptions = computed<SelectOption<string>[]>(() => [
	{ value: 'showAll', label: 'Show all' },
	...(tablesList.value ?? []).map((item) => ({
		value: item.table,
		label: `${item.display_name || item.normalizedTableName} (${item.table})`,
	})),
]);

const userOptions = computed<SelectOption<string>[]>(() => [
	{ value: 'showAll', label: 'Show all' },
	...(usersList.value ?? []).map((user) => ({ value: user.email, label: user.email })),
]);

/** The page's entries by day, for the mobile feed. */
const groupedLogs = computed(() => {
	const groups = new Map<string, AuditRow[]>();
	for (const row of rows.value) {
		const group = groups.get(row.DateOnly);
		if (group) group.push(row);
		else groups.set(row.DateOnly, [row]);
	}
	return Array.from(groups, ([date, entries]) => ({ date, entries }));
});

const isMobileView = ref(false);
let mediaQuery: MediaQueryList | null = null;
function onMediaChange(event: MediaQueryListEvent) {
	isMobileView.value = event.matches;
}

onMounted(() => {
	document.title = 'Connections | Rocketadmin';
	if (typeof window.matchMedia === 'function') {
		mediaQuery = window.matchMedia(MOBILE_QUERY);
		isMobileView.value = mediaQuery.matches;
		mediaQuery.addEventListener?.('change', onMediaChange);
	}
});

onBeforeUnmount(() => mediaQuery?.removeEventListener?.('change', onMediaChange));

watch(connectionID, (id) => load(id), { immediate: true });

function load(id: string) {
	loadLogsPage();
	loadTables(id);
	if (accessLevel.value !== 'none') {
		users
			.fetchConnectionUsers(id)
			.then((res) => {
				usersList.value = res;
			})
			.catch(() => {
				// The store has shown the error.
			});
	}
}

async function loadTables(id: string) {
	try {
		const res = await tables.fetchTables(id);
		if (res.length) {
			tablesList.value = res.map((item) =>
				item.display_name ? { ...item } : { ...item, normalizedTableName: normalizeTableName(item.table) },
			);
		}
		noTablesError.value = res.length === 0;
	} catch (error) {
		serverError.value = isApiError(error)
			? { abstract: error.body.message || error.message, details: error.details }
			: { abstract: error instanceof Error ? error.message : String(error) };
	}
}

function loadLogsPage() {
	fetchLogs({ connectionID: connectionID.value, tableName: tableName.value, userEmail: userEmail.value });
}

function onTableChange(value: string | string[] | null) {
	tableName.value = typeof value === 'string' ? value : 'showAll';
	loadLogsPage();
}

function onUserChange(value: string | string[] | null) {
	userEmail.value = typeof value === 'string' ? value : 'showAll';
	loadLogsPage();
}

function trackBoth(action: string) {
	trackEvent(action);
	posthog.capture(action);
}

function openInfoLogDialog(log: AuditRow) {
	trackBoth('Audit: view changes is clicked');
	dialog.open(AuditInfoDialog, { data: log });
}

function openIntercom() {
	window.Intercom?.('show');
}

function getUserName(email: string): string | null {
	if (!usersList.value) return null;
	return usersList.value.find((user) => user.email === email)?.name || null;
}

function initialsOf(words: string[]): string {
	return words
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? '')
		.join('');
}

function getInitials(email: string): string {
	if (!email) return '?';
	const name = getUserName(email);
	if (name) return initialsOf(name.trim().split(/\s+/));
	return initialsOf((email.split('@')[0] ?? '').split(/[._-]/));
}

function actionIconClass(icon: string | undefined) {
	return ['audit__action-icon', `audit__action-icon--${icon}`];
}
</script>

<template>
	<div class="audit">
		<header class="audit__header">
			<div class="audit__title-block">
				<UiIconButton
					class="audit__back"
					icon="arrow_back"
					label="Back to dashboard"
					:to="`/dashboard/${connectionID}`"
				/>
				<h1 class="audit__title">Audit</h1>
			</div>
			<div class="audit__filters">
				<UiField v-if="tablesList && !serverError && !noTablesError" label="Tables" class="audit__filter">
					<UiSelect
						:model-value="tableName"
						:options="tableOptions"
						data-testid="audit-table-select"
						@click="trackBoth('Audit: table is selected')"
						@update:model-value="onTableChange"
					/>
				</UiField>
				<UiField v-if="usersList && !serverError" label="Users" class="audit__filter">
					<UiSelect
						:model-value="userEmail"
						:options="userOptions"
						data-testid="audit-user-select"
						@click="trackBoth('Audit: user is selected')"
						@update:model-value="onUserChange"
					/>
				</UiField>
			</div>
		</header>

		<AppBanner v-if="noTablesError" :type="AlertType.Info" class="audit__banner" data-testid="audit-no-tables">
			<h3>Rocketadmin can not find any tables</h3>
			<p>
				There are no tables Rocketadmin can track actions on. Please grant Rocketadmin access to required tables or
				create new table. You can create a table with SQL editor.
			</p>
		</AppBanner>

		<AppBanner v-if="serverError" :type="AlertType.Error" class="audit__banner" data-testid="audit-server-error">
			<div v-if="serverError.details">
				<strong>{{ serverError.abstract }}</strong>
				<p class="audit__error-details">{{ serverError.details }}</p>
			</div>
			<p v-else>{{ serverError.abstract }}</p>
			<template #actions>
				<UiButton v-if="accessLevel === 'edit'" variant="secondary" :to="`/edit-db/${connectionID}`">
					Check database credentials
				</UiButton>
				<UiButton v-if="isSaas" variant="danger" @click="openIntercom">Chat with support</UiButton>
				<UiButton
					v-else
					variant="danger"
					href="https://github.com/rocket-admin/rocketadmin/issues"
					target="_blank"
					rel="noopener noreferrer"
				>
					Report a bug
				</UiButton>
			</template>
		</AppBanner>

		<div v-if="loading" class="audit__skeleton">
			<PlaceholderAuditLog />
		</div>

		<template v-if="!noTablesError && !serverError">
			<div v-if="isMobileView" v-show="!loading" class="audit__feed" data-testid="audit-feed">
				<template v-for="group in groupedLogs" :key="group.date">
					<div class="audit__feed-date">{{ group.date }}</div>
					<button
						v-for="(entry, entryIndex) in group.entries"
						:key="`${entry.createdAt}-${entryIndex}`"
						type="button"
						:class="['audit__card', { 'audit__card--fade': entryIndex === group.entries.length - 1 }]"
						@click="openInfoLogDialog(entry)"
					>
						<span class="audit__avatar" aria-hidden="true">{{ getInitials(entry.UserEmail) }}</span>
						<span class="audit__card-body">
							<span class="audit__card-row audit__card-row--top">
								<span class="audit__card-user">
									<span v-if="getUserName(entry.UserEmail)">{{ getUserName(entry.UserEmail) }}</span>
									<span v-else class="audit__card-email">{{ entry.UserEmail }}</span>
								</span>
								<span class="audit__card-time">{{ entry.TimeOnly }}</span>
							</span>
							<span class="audit__card-row">
								<UiIcon v-if="entry.ActionIcon" :name="entry.ActionIcon" size="sm" :class="actionIconClass(entry.ActionIcon)" />
								<span class="audit__card-action">{{ entry.Action || '—' }}</span>
								<span class="audit__card-sep" aria-hidden="true">·</span>
								<span class="audit__card-table">{{ entry.Table }}</span>
							</span>
							<span class="audit__card-row audit__card-row--bottom">
								<UiChip :tone="entry.Status === 'successfully' ? 'success' : 'neutral'">
									{{ entry.Status === 'successfully' ? 'Success' : entry.Status || '—' }}
								</UiChip>
								<span class="audit__card-details">Details &rsaquo;</span>
							</span>
						</span>
					</button>
				</template>
				<UiPaginator
					v-model:page-index="pageIndex"
					v-model:page-size="pageSize"
					:length="length"
					:page-size-options="PAGE_SIZE_OPTIONS"
					items-per-page-label="Per page:"
					show-first-last
					@page="loadLogsPage"
				/>
			</div>

			<div v-else v-show="!loading" class="audit__table-wrapper" data-testid="audit-table">
				<UiTable :columns="columns" :rows="rows" label="Audit log">
					<template #cell-User="{ row }">
						<span class="audit__user">
							<span v-if="getUserName(row.UserEmail)" class="audit__user-name">{{ getUserName(row.UserEmail) }}</span>
							<span :class="{ 'audit__secondary': getUserName(row.UserEmail) }">{{ row.UserEmail }}</span>
						</span>
					</template>
					<template #cell-Table="{ row }">{{ row.Table || '—' }}</template>
					<template #cell-Action="{ row }">
						<span class="audit__action">
							<UiIcon v-if="row.ActionIcon" :name="row.ActionIcon" size="sm" :class="actionIconClass(row.ActionIcon)" />
							{{ row.Action || '—' }}
						</span>
					</template>
					<template #cell-Status="{ row }">
						<UiChip :tone="row.Status === 'successfully' ? 'success' : 'neutral'">{{ row.Status || '—' }}</UiChip>
					</template>
					<template #cell-Date="{ row }">
						<span class="audit__date">
							<span>{{ row.DateOnly }}</span>
							<span class="audit__secondary">{{ row.TimeOnly }}</span>
						</span>
					</template>
					<template #cell-Changes="{ row }">
						<UiButton variant="ghost" size="sm" @click="openInfoLogDialog(row)">Details</UiButton>
					</template>
				</UiTable>
				<UiPaginator
					v-model:page-index="pageIndex"
					v-model:page-size="pageSize"
					:length="length"
					:page-size-options="PAGE_SIZE_OPTIONS"
					items-per-page-label="Per page:"
					show-first-last
					@page="loadLogsPage"
				/>
			</div>
		</template>
	</div>
</template>

<style scoped>
.audit {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	width: clamp(18.75rem, 75vw, 62.5rem);
	height: 100%;
	margin: 0 auto;
	background: var(--color-paper);
}

.audit__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-4);
	width: 100%;
	margin: var(--space-8) 0 var(--space-4);
}

.audit__title-block {
	display: flex;
	align-items: center;
	gap: var(--space-2);
}

.audit__back {
	display: none;
}

.audit__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	line-height: var(--leading-tight);
	color: var(--color-ink);
}

.audit__filters {
	display: flex;
	gap: var(--space-6);
}

.audit__filter {
	min-width: 12rem;
}

.audit__error-details {
	margin-top: var(--space-2);
}

.audit__table-wrapper {
	position: relative;
	min-height: 12.5rem;
	border: 1px solid var(--color-line);
	border-radius: var(--radius-panel);
	background: var(--color-surface);
	box-shadow: var(--shadow-card);
	overflow: hidden;
}

.audit__user,
.audit__date {
	display: flex;
	flex-direction: column;
}

.audit__user-name {
	font-weight: var(--weight-medium);
}

.audit__secondary {
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.audit__action {
	display: flex;
	align-items: center;
	gap: var(--space-2);
}

.audit__action-icon--add,
.audit__action-icon--upload {
	color: var(--color-success);
}

.audit__action-icon--delete {
	color: var(--color-danger);
}

.audit__action-icon--edit,
.audit__action-icon--download {
	color: var(--color-accent);
}

.audit__action-icon--visibility {
	color: var(--color-muted);
}

/* The mobile feed. */
.audit__feed {
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
	width: 100%;
	min-width: 0;
	padding-bottom: var(--space-4);
}

.audit__feed-date {
	position: sticky;
	top: var(--header-height);
	z-index: 2;
	padding: var(--space-2) 0 var(--space-1);
	background: var(--color-paper);
	font-size: var(--text-xs);
	font-weight: var(--weight-semibold);
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--color-muted);
}

.audit__card {
	display: flex;
	align-items: flex-start;
	gap: var(--space-3);
	width: 100%;
	padding: var(--space-3) var(--space-4);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-card);
	background: var(--color-surface);
	box-shadow: var(--shadow-card);
	color: var(--color-ink);
	font: inherit;
	text-align: start;
	cursor: pointer;
	transition: opacity var(--motion-fast);
}

.audit__card:focus-visible {
	outline: none;
	box-shadow: var(--shadow-focus);
}

.audit__card--fade {
	opacity: 0.6;
}

.audit__avatar {
	display: inline-flex;
	flex: 0 0 auto;
	align-items: center;
	justify-content: center;
	width: 2.25rem;
	height: 2.25rem;
	border-radius: 50%;
	background: color-mix(in srgb, var(--color-accent) 16%, var(--color-surface));
	color: var(--color-accent-ink);
	font-size: var(--text-sm);
	font-weight: var(--weight-semibold);
}

.audit__card-body {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--space-1);
	min-width: 0;
}

.audit__card-row {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	font-size: var(--text-sm);
}

.audit__card-row--top,
.audit__card-row--bottom {
	justify-content: space-between;
}

.audit__card-user {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: var(--weight-semibold);
}

.audit__card-email {
	font-weight: var(--weight-regular);
	color: var(--color-ink-soft);
}

.audit__card-time {
	flex: 0 0 auto;
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.audit__card-action {
	font-weight: var(--weight-medium);
}

.audit__card-sep {
	color: var(--color-muted-soft);
}

.audit__card-table {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-family: var(--font-mono);
	font-size: var(--text-xs);
	color: var(--color-ink-soft);
}

.audit__card-details {
	font-weight: var(--weight-medium);
	color: var(--color-accent-ink);
}

@media (width <= 600px) {
	.audit {
		width: 100%;
		padding: 0 var(--space-4);
		box-sizing: border-box;
		overflow-x: clip;
	}

	.audit__header {
		flex-direction: column;
		align-items: stretch;
		gap: var(--space-3);
		margin: var(--space-4) 0 var(--space-3);
	}

	.audit__title-block {
		gap: 0;
	}

	.audit__back {
		display: inline-flex;
		margin-inline-start: calc(var(--space-3) * -1);
	}

	.audit__filters {
		gap: var(--space-2);
		width: 100%;
		min-width: 0;
	}

	.audit__filter {
		flex: 1 1 0;
		min-width: 0;
	}
}
</style>
