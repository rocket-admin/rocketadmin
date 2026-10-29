<script setup lang="ts">
/**
 * The top bar of AppComponent: logo, the connection switcher and connection tabs, and the account
 * menu. Below 600px the tabs and account menu move into AppNavDrawer, opened by the menu button.
 */
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { UiBadge, UiIcon, UiIconButton, UiMenu, UiMenuItem } from '@/components/ui';
import { environment } from '@/environment';
import { useConnectionsStore } from '@/stores/connections';
import { useUserStore } from '@/stores/user';
import { ACCOUNT_LINKS, CONNECTION_TAB_CAPTIONS, connectionTabPath, HELP_CENTER_URL } from './navigation';

// Served from /assets at runtime (copied from frontend/src/assets), so it is not a module import.
const LOGO_URL = '/assets/rocketadmin_logo_black.svg';

const props = defineProps<{
	/** AppComponent.userLoggedIn: null while the user is loading. */
	userLoggedIn: boolean | null;
}>();

const emit = defineEmits<{ 'open-menu': []; 'log-out': [] }>();

const connections = useConnectionsStore();
const user = useUserStore();

const accountLinks = ACCOUNT_LINKS.filter((link) => !link.saasOnly || environment.saas);
const email = computed(() => user.currentUser?.email ?? '');
const emailUnverified = computed(() => user.currentUser !== null && !user.currentUser.isActive);
const isTestConnection = computed(() => connections.currentConnection?.isTestConnection ?? false);
const ownConnections = computed(() => connections.ownConnectionsList ?? []);
/** Nothing to switch to: the only own connection is the one that is open. */
const switcherDisabled = computed(() => ownConnections.value.length === 1 && !isTestConnection.value);
const signedIn = computed(() => props.userLoggedIn === true);
</script>

<template>
	<header :class="['app-header', { 'app-header--connection': connections.connectionID }]">
		<div class="app-header__brand">
			<RouterLink v-if="userLoggedIn" to="/connections-list" class="app-header__logo">
				<img :src="LOGO_URL" alt="Rocketadmin logo" class="app-header__logo-image">
			</RouterLink>
			<a v-else-if="userLoggedIn === false" href="https://rocketadmin.com/" class="app-header__logo">
				<img :src="LOGO_URL" alt="Rocketadmin logo" class="app-header__logo-image">
			</a>

			<template v-if="connections.connectionID">
				<span class="app-header__slash" aria-hidden="true">/</span>
				<UiMenu label="Connections" :disabled="switcherDisabled">
					<template #trigger="{ triggerProps }">
						<button v-bind="triggerProps" type="button" class="app-header__switcher" :disabled="switcherDisabled">
							<span class="app-header__switcher-name">{{ connections.currentConnectionName }}</span>
							<UiIcon v-if="!switcherDisabled" name="arrow_drop_down" size="sm" />
						</button>
					</template>
					<UiMenuItem v-if="ownConnections.length === 0" to="/connect-db">Add your own connection</UiMenuItem>
					<UiMenuItem
						v-for="item in ownConnections"
						v-else
						:key="item.connection.id ?? item.displayTitle"
						:to="`/dashboard/${item.connection.id}`"
						:class="{ 'app-header__connection--active': connections.connectionID === item.connection.id }"
					>
						{{ item.displayTitle }}
					</UiMenuItem>
				</UiMenu>
			</template>
		</div>

		<nav v-if="connections.connectionID" class="app-header__tabs" aria-label="Connection">
			<RouterLink
				v-for="tab in connections.visibleTabs"
				:key="tab"
				:to="connectionTabPath(tab, connections.connectionID)"
				:data-testid="`${tab}-header-link`"
				class="app-header__tab"
				active-class="app-header__tab--active"
				:title="tab === 'edit-db' ? 'Database credentials' : undefined"
			>
				<UiIcon v-if="tab === 'edit-db'" name="key_vertical" size="sm" label="Database credentials" />
				<template v-else>{{ CONNECTION_TAB_CAPTIONS[tab] }}</template>
			</RouterLink>
		</nav>

		<div v-if="signedIn" class="app-header__actions">
			<UiMenu label="Account" align="end">
				<template #trigger="{ triggerProps }">
					<UiIconButton
						v-bind="triggerProps"
						icon="account_circle"
						:label="email || 'Account'"
						:badge="emailUnverified ? 1 : false"
						badge-label="email not verified"
						class="app-header__account"
						data-testid="account-menu-anchor-header-button"
					/>
				</template>
				<UiMenuItem to="/user-settings" :description="email" data-testid="account-link-account-menu">
					<template #leading>
						<UiBadge :content="1" :hidden="!emailUnverified" label="Email not verified">
							<UiIcon name="face" size="sm" />
						</UiBadge>
					</template>
					Account
				</UiMenuItem>
				<UiMenuItem v-for="link in accountLinks" :key="link.to" :to="link.to" :icon="link.icon" :data-testid="link.testId">
					{{ link.label }}
				</UiMenuItem>
				<UiMenuItem :href="HELP_CENTER_URL" target="_blank" icon="help">Help center</UiMenuItem>
				<UiMenuItem icon="logout" data-testid="logout-button-account-menu" @select="emit('log-out')">
					Log out
				</UiMenuItem>
			</UiMenu>
		</div>

		<UiIconButton
			v-if="signedIn"
			icon="menu"
			label="Open navigation"
			class="app-header__menu-button"
			@click="emit('open-menu')"
		/>
	</header>
</template>

<style scoped>
.app-header {
	position: sticky;
	top: 0;
	z-index: var(--z-sticky);
	/* Brand and actions take equal side columns so the connection tabs sit in the true center. */
	display: grid;
	grid-template-columns: 1fr minmax(0, auto) 1fr;
	align-items: center;
	gap: var(--space-4);
	height: var(--header-height);
	padding: 0 var(--space-6);
	border-bottom: 1px solid var(--color-line);
	background: var(--color-surface);
}

.app-header__brand {
	grid-column: 1;
	display: flex;
	align-items: center;
	gap: var(--space-2);
	min-width: 0;
}

.app-header__logo {
	display: flex;
	align-items: center;
	flex: none;
}

.app-header__logo-image {
	display: block;
	height: 1.5rem;
	width: auto;
}

.app-header__slash {
	color: var(--color-muted-soft);
	font-size: var(--text-md);
}

.app-header__switcher {
	display: inline-flex;
	align-items: center;
	gap: var(--space-1);
	min-width: 0;
	max-width: 16rem;
	padding: var(--space-2) var(--space-3);
	border: none;
	border-radius: var(--radius-pill);
	background: transparent;
	color: var(--color-ink);
	font-size: var(--text-base);
	font-weight: var(--weight-medium);
	cursor: pointer;
	transition: background var(--motion-fast) var(--ease-out);
}

.app-header__switcher:hover:not(:disabled),
.app-header__switcher[aria-expanded="true"] {
	background: var(--color-paper);
}

.app-header__switcher:disabled {
	cursor: default;
}

.app-header__switcher-name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.app-header__connection--active {
	color: var(--color-accent);
	font-weight: var(--weight-semibold);
}

.app-header__tabs {
	grid-column: 2;
	display: flex;
	align-items: center;
	gap: var(--space-1);
	min-width: 0;
	overflow-x: auto;
}

.app-header__tab {
	display: inline-flex;
	align-items: center;
	padding: var(--space-2) var(--space-3);
	border-radius: var(--radius-pill);
	color: var(--color-muted);
	font-size: var(--text-base);
	font-weight: var(--weight-medium);
	text-decoration: none;
	white-space: nowrap;
	transition:
		background var(--motion-fast),
		color var(--motion-fast);
}

.app-header__tab:hover {
	background: var(--color-paper);
	color: var(--color-ink);
}

.app-header__tab--active {
	background: var(--color-paper-2);
	color: var(--color-accent);
}

.app-header__actions,
.app-header__menu-button {
	grid-column: 3;
	grid-row: 1;
	justify-self: end;
}

.app-header__menu-button {
	display: none;
}

@media screen and (max-width: 600px) {
	.app-header {
		padding: 0 var(--space-4);
	}

	.app-header__tabs,
	.app-header__actions {
		display: none;
	}

	.app-header__menu-button {
		display: inline-flex;
	}

	.app-header--connection .app-header__logo {
		display: none;
	}
}
</style>
