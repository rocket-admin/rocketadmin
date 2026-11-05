<script setup lang="ts">
// The mat-sidenav of AppComponent: on narrow screens it carries the connection tabs and the account
// links. Choosing anything closes it.
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { UiBadge, UiDrawer, UiIcon } from '@/components/ui';
import { environment } from '@/environment';
import { useConnectionsStore } from '@/stores/connections';
import { useUserStore } from '@/stores/user';
import { ACCOUNT_LINKS, CONNECTION_TAB_CAPTIONS, connectionTabPath, HELP_CENTER_URL } from './navigation';

defineProps<{ open: boolean }>();

const emit = defineEmits<{ 'update:open': [boolean]; 'log-out': []; 'support-chat': [] }>();

const connections = useConnectionsStore();
const user = useUserStore();

const accountLinks = ACCOUNT_LINKS.filter((link) => !link.saasOnly || environment.saas);
const email = computed(() => user.currentUser?.email ?? '');
const emailUnverified = computed(() => user.currentUser !== null && !user.currentUser.isActive);

function close() {
	emit('update:open', false);
}

function choose(event: 'log-out' | 'support-chat') {
	close();
	if (event === 'log-out') emit('log-out');
	else emit('support-chat');
}
</script>

<template>
	<UiDrawer :open="open" label="Main navigation" size="sm" @update:open="emit('update:open', $event)">
		<template #header>
			<span class="app-nav__title">Rocketadmin</span>
		</template>

		<nav v-if="user.currentUser" class="app-nav" aria-label="Main">
			<ul class="app-nav__list">
				<li v-if="!connections.connectionID">
					<RouterLink to="/connections-list" class="app-nav__link" active-class="app-nav__link--active" @click="close">
						<UiIcon name="list" size="sm" />
						Connections
					</RouterLink>
				</li>
				<template v-else>
					<li v-for="tab in connections.visibleTabs" :key="tab">
						<RouterLink
							:to="connectionTabPath(tab, connections.connectionID)"
							:data-testid="`${tab}-header-link`"
							class="app-nav__link app-nav__link--tab"
							active-class="app-nav__link--active"
							@click="close"
						>
							{{ CONNECTION_TAB_CAPTIONS[tab] }}
						</RouterLink>
					</li>
				</template>
			</ul>

			<ul class="app-nav__list app-nav__list--account">
				<li>
					<RouterLink
						to="/user-settings"
						class="app-nav__link"
						active-class="app-nav__link--active"
						data-testid="account-link-account-menu"
						@click="close"
					>
						<UiBadge :content="1" :hidden="!emailUnverified" label="Email not verified">
							<UiIcon name="face" size="sm" />
						</UiBadge>
						<span class="app-nav__label">
							Account
							<span class="app-nav__secondary">{{ email }}</span>
						</span>
					</RouterLink>
				</li>
				<li v-for="link in accountLinks" :key="link.to">
					<RouterLink
						:to="link.to"
						class="app-nav__link"
						active-class="app-nav__link--active"
						:data-testid="link.testId"
						@click="close"
					>
						<UiIcon :name="link.icon" size="sm" />
						{{ link.label }}
					</RouterLink>
				</li>
				<li>
					<button
						type="button"
						class="app-nav__link"
						data-testid="support-chat-button-account-menu"
						@click="choose('support-chat')"
					>
						<UiIcon name="chat_bubble" size="sm" />
						Chat with support
					</button>
				</li>
				<li>
					<a :href="HELP_CENTER_URL" target="_blank" rel="noopener noreferrer" class="app-nav__link" @click="close">
						<UiIcon name="help" size="sm" />
						Help center
					</a>
				</li>
				<li>
					<button type="button" class="app-nav__link" data-testid="logout-button-account-menu" @click="choose('log-out')">
						<UiIcon name="logout" size="sm" />
						Log out
					</button>
				</li>
			</ul>
		</nav>
	</UiDrawer>
</template>

<style scoped>
.app-nav__title {
	font-family: var(--font-display);
	font-size: var(--text-md);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.app-nav {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}

.app-nav__list {
	display: flex;
	flex-direction: column;
	gap: var(--space-05);
	margin: 0;
	padding: 0;
	list-style: none;
}

.app-nav__list--account {
	padding-top: var(--space-4);
	border-top: 1px solid var(--color-line);
}

.app-nav__link {
	display: flex;
	align-items: center;
	gap: var(--space-3);
	width: 100%;
	padding: var(--space-2) var(--space-3);
	border: none;
	border-radius: var(--radius-control);
	background: transparent;
	color: var(--color-ink-soft);
	font-size: var(--text-base);
	text-align: start;
	text-decoration: none;
	cursor: pointer;
}

.app-nav__link:hover {
	background: var(--color-paper);
	color: var(--color-ink);
}

.app-nav__link--active {
	background: var(--color-paper-2);
	color: var(--color-accent);
}

.app-nav__label {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.app-nav__secondary {
	overflow: hidden;
	text-overflow: ellipsis;
	color: var(--color-muted);
	font-size: var(--text-xs);
}
</style>
