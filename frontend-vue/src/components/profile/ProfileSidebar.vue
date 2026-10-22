<script setup lang="ts">
// Port of frontend/src/app/components/profile/profile-sidebar: the collapsible navigation of the
// account pages (user settings, company, secrets, API keys, Zapier). The collapsed state is a
// global UI setting (`profileSidebarCollapsed`). Hidden on narrow screens, like Angular.
import { onMounted, ref } from 'vue';
import { UiButton, UiDivider, UiIcon, UiIconButton, UiList, UiListItem, vTooltip } from '@/components/ui';
import { environment } from '@/environment';
import { useUiSettingsStore } from '@/stores/ui-settings';

export type ProfileTab = 'account' | 'company' | 'api' | 'secrets' | 'zapier';

withDefaults(
	defineProps<{
		/** The page the sidebar is shown on; its link is highlighted. */
		activeTab?: ProfileTab;
	}>(),
	{ activeTab: 'account' },
);

interface SidebarLink {
	tab: ProfileTab;
	to: string;
	icon: string;
	caption: string;
}

const groups: { label: string; links: SidebarLink[] }[] = [
	{
		label: 'General',
		links: [
			{ tab: 'account', to: '/user-settings', icon: 'person', caption: 'Account' },
			{ tab: 'company', to: '/company', icon: 'apartment', caption: 'Company' },
		],
	},
	{ label: 'Security', links: [{ tab: 'secrets', to: '/secrets', icon: 'key', caption: 'Secrets' }] },
	{
		label: 'Developer',
		links: [
			{ tab: 'api', to: '/api-keys', icon: 'vpn_key', caption: 'API Keys' },
			...(environment.saas
				? [{ tab: 'zapier' as const, to: '/zapier', icon: 'electric_bolt', caption: 'Zapier' }]
				: []),
		],
	},
];

const uiSettings = useUiSettingsStore();
const collapsed = ref(false);
// Width transitions only after the stored state is applied, so the page does not animate on load.
const initialized = ref(false);

onMounted(() => {
	uiSettings
		.getUiSettings()
		.then((settings) => {
			collapsed.value = settings?.globalSettings?.profileSidebarCollapsed ?? false;
		})
		.catch(() => {});
	setTimeout(() => {
		initialized.value = true;
	}, 0);
});

function toggleCollapsed() {
	collapsed.value = !collapsed.value;
	uiSettings.updateGlobalSetting('profileSidebarCollapsed', collapsed.value);
}
</script>

<template>
	<aside
		class="profile-sidebar"
		:class="{ 'profile-sidebar--collapsed': collapsed, 'profile-sidebar--initialized': initialized }"
	>
		<UiButton v-if="!collapsed" variant="ghost" size="sm" class="profile-sidebar__toggle" @click="toggleCollapsed">
			Collapse
			<template #trailing><UiIcon name="chevron_left" size="sm" /></template>
		</UiButton>
		<UiIconButton
			v-else
			icon="chevron_right"
			label="Expand"
			size="sm"
			class="profile-sidebar__toggle profile-sidebar__toggle--collapsed"
			@click="toggleCollapsed"
		/>

		<nav class="profile-sidebar__nav" aria-label="Account settings">
			<template v-for="(group, index) in groups" :key="group.label">
				<UiDivider v-if="index > 0" class="profile-sidebar__divider" />
				<span v-if="!collapsed" class="profile-sidebar__group-label">{{ group.label }}</span>
				<UiList size="sm" class="profile-sidebar__list">
					<UiListItem
						v-for="link in group.links"
						:key="link.tab"
						v-tooltip:right="collapsed ? link.caption : ''"
						:to="link.to"
						:active="activeTab === link.tab"
						class="profile-sidebar__item"
						:class="{ 'profile-sidebar__item--active': activeTab === link.tab }"
					>
						<template #leading>
							<!-- Collapsed, the icon alone names the link. -->
							<UiIcon :name="link.icon" size="sm" :label="collapsed ? link.caption : undefined" />
						</template>
						<template v-if="!collapsed">{{ link.caption }}</template>
					</UiListItem>
				</UiList>
			</template>
		</nav>
	</aside>
</template>

<style scoped>
.profile-sidebar {
	display: flex;
	flex: none;
	flex-direction: column;
	width: 220px;
	height: 100%;
	overflow: hidden;
	border-inline-end: 1px solid var(--color-line);
	background: var(--color-surface);
}

.profile-sidebar--initialized {
	transition: width var(--motion-base) var(--ease-out);
}

.profile-sidebar--collapsed {
	width: 56px;
}

.profile-sidebar__toggle {
	align-self: flex-start;
	margin: var(--space-2) var(--space-3) 0;
}

.profile-sidebar__toggle--collapsed {
	align-self: center;
	margin: var(--space-3) var(--space-2);
}

.profile-sidebar__nav {
	padding: var(--space-1) var(--space-2);
	overflow: hidden;
}

.profile-sidebar__group-label {
	display: block;
	padding: var(--space-3) var(--space-3) var(--space-1);
	font-size: var(--text-2xs);
	font-weight: var(--weight-semibold);
	letter-spacing: 0.02em;
	color: var(--color-muted);
}

.profile-sidebar__divider {
	margin: var(--space-1) var(--space-3);
}

.profile-sidebar__item {
	white-space: nowrap;
}

.profile-sidebar__item--active :deep(.ui-list-item__leading) {
	color: var(--color-accent);
}

@media (width <= 600px) {
	.profile-sidebar {
		display: none;
	}
}
</style>
