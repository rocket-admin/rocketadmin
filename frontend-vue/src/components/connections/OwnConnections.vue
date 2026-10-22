<script setup lang="ts">
// Port of connections-list/own-connections: the user's connection cards (three, or all of them —
// the choice is a stored UI setting), the "Add database" button for admins, and with no connections
// yet the grid of database types to connect.
import posthog from 'posthog-js';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { UiButton, UiIcon } from '@/components/ui';
import { trackEvent } from '@/composables/useAnalytics';
import { supportedDatabasesTitles, supportedOrderedDatabases } from '@/consts/databases';
import { CompanyMemberRole } from '@/models/company';
import { DBtype } from '@/models/connection';
import type { User } from '@/models/user';
import { useCompanyStore } from '@/stores/company';
import type { ConnectionListItem } from '@/stores/connections';
import { useUiSettingsStore } from '@/stores/ui-settings';
import { dbLogo } from './dbLogos';

const props = defineProps<{
	currentUser: User | null;
	/** null while loading. */
	connections: ConnectionListItem[] | null;
	companyId?: string | null;
}>();

const COLLAPSED_COUNT = 3;
const SCHEMA_EDITABLE = new Set<string>([
	DBtype.Postgres,
	DBtype.MySQL,
	DBtype.Oracle,
	DBtype.MSSQL,
	DBtype.ClickHouse,
]);
const titles: Record<string, string> = supportedDatabasesTitles;

const uiSettings = useUiSettingsStore();
const company = useCompanyStore();

const displayedCardCount = ref(COLLAPSED_COUNT);
/** undefined until the UI settings arrive (Angular's uninitialised field). */
const connectionsListCollapsed = ref<boolean | undefined>(undefined);
const hasMultipleMembers = ref(false);
const isDarkMode = uiSettings.isDarkMode;

const isAdmin = computed(
	() => props.currentUser?.role === CompanyMemberRole.CAO || props.currentUser?.role === CompanyMemberRole.SystemAdmin,
);
const hasConnections = computed(() => Boolean(props.connections?.length));
const isEmpty = computed(() => props.connections !== null && !props.connections.length);
const displayedConnections = computed(() => (props.connections ?? []).slice(0, displayedCardCount.value));

onMounted(async () => {
	try {
		const settings = await uiSettings.getUiSettings();
		connectionsListCollapsed.value = settings?.globalSettings?.connectionsListCollapsed;
		displayedCardCount.value = connectionsListCollapsed.value
			? COLLAPSED_COUNT
			: props.connections?.length || COLLAPSED_COUNT;
	} catch {
		// The store has shown the error.
	}
});

watch(
	() => props.companyId,
	async (companyId) => {
		if (!companyId) return;
		try {
			const members = await company.fetchCompanyMembers(companyId);
			hasMultipleMembers.value = Boolean(members && members.length > 1);
		} catch {
			// The store has shown the error.
		}
	},
	{ immediate: true },
);

watch(
	() => props.connections,
	(connections) => {
		if (connections && !connectionsListCollapsed.value) displayedCardCount.value = connections.length;
	},
	{ immediate: true },
);

function showMore() {
	displayedCardCount.value = props.connections?.length ?? COLLAPSED_COUNT;
	uiSettings.updateGlobalSetting('connectionsListCollapsed', false);
}

function showLess() {
	displayedCardCount.value = COLLAPSED_COUNT;
	uiSettings.updateGlobalSetting('connectionsListCollapsed', true);
}

function supportsSchemaEditing(type: string): boolean {
	return SCHEMA_EDITABLE.has(type);
}

function getMainTitle(database: string): string {
	const title = titles[database] || database;
	const match = title.match(/^([^(]+)/);
	return match?.[1] ? match[1].trim() : title;
}

function getSubTitle(database: string): string {
	const title = titles[database] || database;
	const match = title.match(/(\([^)]+\))/);
	return match?.[1] ?? '';
}

function logoUrl(item: ConnectionListItem): string {
	const connection = item.connection as ConnectionListItem['connection'] & {
		connection_properties?: { logo_url?: string | null } | null;
	};
	return connection.connection_properties?.logo_url || '/assets/rocketadmin_logo_white-short.svg';
}

function track(action: string) {
	trackEvent(action);
	posthog.capture(action);
}
</script>

<template>
	<div class="own-connections">
		<h1 v-if="isEmpty && isAdmin" class="own-connections__heading">Add your first connection</h1>

		<template v-if="hasConnections">
			<ul class="own-connections__list">
				<li v-for="item in displayedConnections" :key="item.connection.id ?? ''" class="own-connections__item">
					<RouterLink
						:to="`/dashboard/${item.connection.id}`"
						class="own-connections__card"
						@click="track('Connections: open own db is clicked')"
					>
						<img :src="logoUrl(item)" class="own-connections__logo" alt="Rocketadmin connection">
						<span class="own-connections__info">
							<span class="own-connections__title">{{ item.displayTitle }}</span>
							<span class="own-connections__type">{{ titles[item.connection.type] }}</span>
						</span>
					</RouterLink>
					<RouterLink
						v-if="item.accessLevel === 'edit' && supportsSchemaEditing(item.connection.type)"
						:to="`/edit-database-schema/${item.connection.id}`"
						class="own-connections__schema"
					>
						<UiIcon name="auto_awesome" size="sm" class="own-connections__schema-ai" />
						<span>Edit schema</span>
						<UiIcon name="arrow_forward" size="sm" class="own-connections__schema-arrow" />
					</RouterLink>
				</li>
			</ul>

			<div class="own-connections__toggle">
				<UiButton v-if="(connections?.length ?? 0) > displayedCardCount" variant="ghost" @click="showMore">
					Show all
				</UiButton>
				<UiButton v-if="displayedCardCount > 3" variant="ghost" @click="showLess">Show less</UiButton>
			</div>
		</template>

		<section v-else class="own-connections__section" aria-labelledby="own-connections-connect-label">
			<span id="own-connections-connect-label" class="own-connections__section-label">Connect your own</span>
			<ul class="own-connections__db-grid">
				<li v-for="database in supportedOrderedDatabases" :key="database">
					<RouterLink
						:to="{ path: '/connect-db', query: { type: database } }"
						class="own-connections__db-card"
						:data-testid="`${database}-test-connection-list-item`"
					>
						<span class="own-connections__db-icon-box">
							<img
								:src="dbLogo(database, isDarkMode)"
								alt=""
								:class="['own-connections__db-icon', `own-connections__db-icon--${database}`]"
							>
						</span>
						<span class="own-connections__db-label">
							{{ getMainTitle(database) }}
							<span v-if="getSubTitle(database)" class="own-connections__db-sublabel">
								{{ getSubTitle(database) }}
							</span>
						</span>
					</RouterLink>
				</li>
			</ul>
		</section>

		<template v-if="hasConnections && isAdmin">
			<div class="own-connections__fab own-connections__fab--desktop">
				<UiButton
					to="/connect-db"
					size="lg"
					class="own-connections__add"
					data-testid="add-connection-button"
					@click="track('Connections: Add connection button is clicked')"
				>
					<template #leading><UiIcon name="add" /></template>
					Add database
				</UiButton>
			</div>
			<div class="own-connections__fab own-connections__fab--mobile">
				<UiButton
					to="/connect-db"
					size="lg"
					class="own-connections__add"
					data-testid="add-connection-button"
					@click="track('Connections: Add connection button is clicked')"
				>
					<template #leading><UiIcon name="add" /></template>
					Add connection
				</UiButton>
			</div>
		</template>

		<div v-if="isEmpty && hasMultipleMembers" class="own-connections__empty">
			<p class="own-connections__empty-title">Invited to a company but don't see your admin panel?</p>
			<p class="own-connections__empty-text">Request access from your Account Owner</p>
		</div>
	</div>
</template>

<style scoped>
.own-connections {
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	width: 100%;
}

.own-connections__heading {
	margin: 0 0 var(--space-8);
	font-family: var(--font-display);
	font-size: var(--text-2xl);
	font-weight: var(--weight-semibold);
	text-align: center;
	color: var(--color-ink);
}

.own-connections__section {
	width: 100%;
}

.own-connections__section-label {
	display: block;
	margin-bottom: var(--space-3);
	font-size: var(--text-2xs);
	font-weight: var(--weight-bold);
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--color-muted);
}

.own-connections__db-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(8.875rem, 1fr));
	align-items: stretch;
	gap: var(--space-5);
	margin: 0;
	padding: 0;
	list-style: none;
	width: 100%;
}

.own-connections__db-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--space-1);
	height: 100%;
	min-height: 5.625rem;
	padding: var(--space-2);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-control);
	background: var(--color-surface);
	box-shadow: var(--shadow-card);
	color: inherit;
	font-weight: var(--weight-semibold);
	text-decoration: none;
	transition:
		box-shadow var(--motion-fast) var(--ease-out),
		border-color var(--motion-fast) var(--ease-out);
}

.own-connections__db-card:hover {
	border-color: var(--color-line-strong);
	box-shadow: var(--shadow-lift);
}

.own-connections__db-card:focus-visible,
.own-connections__card:focus-visible,
.own-connections__schema:focus-visible {
	outline: none;
	box-shadow: var(--shadow-focus);
}

.own-connections__db-icon-box {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	height: 2rem;
	width: 2rem;
}

.own-connections__db-icon {
	height: 1.75rem;
	width: 1.75rem;
	object-fit: contain;
}

.own-connections__db-label {
	font-size: var(--text-sm);
	text-align: center;
}

.own-connections__db-sublabel {
	display: block;
	font-size: var(--text-2xs);
	font-weight: var(--weight-regular);
	color: var(--color-muted);
}

.own-connections__list {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(18.75rem, calc(33.33% - var(--space-4))));
	justify-content: center;
	gap: var(--space-5);
	margin: 0 0 var(--space-2);
	padding: 0;
	list-style: none;
	width: 100%;
}

.own-connections__item {
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
	min-width: 0;
	padding: var(--space-3);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-control);
	background: var(--color-surface);
	transition:
		border-color var(--motion-fast) var(--ease-out),
		box-shadow var(--motion-fast) var(--ease-out);
}

.own-connections__item:has(.own-connections__card:hover) {
	border-color: var(--color-accent);
	box-shadow: var(--shadow-lift);
}

.own-connections__card {
	display: flex;
	align-items: center;
	gap: var(--space-3);
	height: 4.5rem;
	min-width: 0;
	padding: var(--space-2);
	border-radius: var(--radius-control);
	background-color: var(--color-ink);
	color: var(--color-paper);
	text-decoration: none;
	overflow: hidden;
}

.own-connections__logo {
	height: 85%;
	max-width: 40%;
	object-fit: contain;
}

.own-connections__info {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.own-connections__title {
	overflow: hidden;
	font-size: var(--text-md);
	font-weight: var(--weight-bold);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.own-connections__type {
	font-size: var(--text-sm);
	opacity: 0.8;
}

.own-connections__schema {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--space-2);
	height: 2.125rem;
	border-radius: var(--radius-control);
	color: var(--color-ink-soft);
	font-size: var(--text-sm);
	font-weight: var(--weight-medium);
	text-decoration: none;
	transition:
		color var(--motion-fast) var(--ease-out),
		background-color var(--motion-fast) var(--ease-out);
}

.own-connections__schema:hover {
	background-color: var(--color-paper-2);
	color: var(--color-accent);
}

.own-connections__schema-ai {
	color: var(--color-accent);
}

.own-connections__schema-arrow {
	position: absolute;
	right: var(--space-3);
	opacity: 0;
	transform: translateX(-4px);
	transition:
		opacity var(--motion-fast) var(--ease-out),
		transform var(--motion-fast) var(--ease-out);
}

.own-connections__schema:hover .own-connections__schema-arrow {
	opacity: 1;
	transform: translateX(0);
}

.own-connections__toggle {
	display: flex;
	justify-content: center;
	margin: var(--space-3) 0 var(--space-2);
}

.own-connections__fab {
	display: flex;
	align-items: center;
	align-self: flex-end;
	gap: var(--space-3);
	margin-top: var(--space-12);
}

.own-connections__fab--mobile {
	display: none;
}

.own-connections__add {
	min-width: 11.125rem;
	border-radius: var(--radius-pill);
	box-shadow: var(--shadow-lift);
}

.own-connections__empty {
	margin-top: auto;
	color: var(--color-muted);
	text-align: center;
}

.own-connections__empty-title {
	margin: 0;
	font-size: var(--text-xs);
	font-weight: var(--weight-medium);
	text-transform: uppercase;
}

.own-connections__empty-text {
	margin: var(--space-1) 0 0;
}

@media (prefers-color-scheme: dark) {
	.own-connections__db-icon--mongodb,
	.own-connections__db-icon--mysql,
	.own-connections__db-icon--dynamodb,
	.own-connections__db-icon--mssql {
		filter: brightness(2);
	}
}

@media (width <= 600px) {
	.own-connections__heading {
		margin-bottom: var(--space-5);
		font-size: var(--text-xl);
	}

	.own-connections__db-grid {
		grid-template-columns: 1fr;
		gap: var(--space-2);
	}

	.own-connections__db-card {
		flex-direction: row;
		justify-content: flex-start;
		gap: var(--space-3);
		min-height: 3.375rem;
		padding: var(--space-2) var(--space-4);
	}

	.own-connections__db-label {
		flex: 1;
		min-width: 0;
		text-align: left;
	}

	.own-connections__list {
		grid-template-columns: 1fr;
		gap: var(--space-2);
	}

	.own-connections__item {
		gap: var(--space-1);
		padding: var(--space-2);
	}

	.own-connections__card {
		height: 3.5rem;
	}

	.own-connections__fab {
		position: fixed;
		right: 9vw;
		bottom: max(4rem, 10vw);
		z-index: var(--z-sticky);
		flex-direction: column;
		align-items: flex-end;
	}

	.own-connections__fab--desktop {
		display: none;
	}

	.own-connections__fab--mobile {
		display: flex;
	}
}
</style>
