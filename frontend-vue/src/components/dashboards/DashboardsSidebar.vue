<script setup lang="ts">
// Port of frontend/src/app/components/dashboards/dashboards-sidebar: the Dashboards / Panels
// switcher beside the dashboards and panels pages. Its collapsed state is a per-connection UI setting.
import { nextTick, onMounted, ref } from 'vue';
import { UiButton, UiIcon, UiIconButton, UiList, UiListItem, vTooltip } from '@/components/ui';
import { useUiSettingsStore } from '@/stores/ui-settings';

const props = withDefaults(
	defineProps<{
		connectionId: string;
		/** The page the sidebar sits on. */
		activeTab?: 'dashboards' | 'queries';
	}>(),
	{ activeTab: 'dashboards' },
);

const uiSettings = useUiSettingsStore();
const collapsed = ref(false);
/** Transitions start after the first render, so the stored state doesn't animate in on load. */
const initialized = ref(false);

onMounted(async () => {
	loadCollapsedState();
	await nextTick();
	setTimeout(() => {
		initialized.value = true;
	}, 0);
});

function toggleCollapsed(): void {
	collapsed.value = !collapsed.value;
	uiSettings.updateConnectionSetting(props.connectionId, 'dashboardsSidebarCollapsed', collapsed.value);
}

async function loadCollapsedState(): Promise<void> {
	try {
		const settings = await uiSettings.getUiSettings();
		collapsed.value = settings?.connections?.[props.connectionId]?.dashboardsSidebarCollapsed ?? false;
	} catch {
		// The client has shown the error; keep the sidebar expanded.
	}
}
</script>

<template>
	<aside
		class="dashboards-sidebar"
		:class="{ 'dashboards-sidebar--collapsed': collapsed, 'dashboards-sidebar--initialized': initialized }"
	>
		<UiButton
			v-if="!collapsed"
			variant="ghost"
			size="sm"
			class="dashboards-sidebar__toggle"
			data-testid="dashboards-sidebar-toggle"
			@click="toggleCollapsed"
		>
			Collapse
			<template #trailing><UiIcon name="chevron_left" size="sm" /></template>
		</UiButton>
		<UiIconButton
			v-else
			icon="chevron_right"
			label="Expand"
			class="dashboards-sidebar__toggle dashboards-sidebar__toggle--collapsed"
			data-testid="dashboards-sidebar-toggle"
			@click="toggleCollapsed"
		/>

		<UiList as="nav" label="Dashboards" class="dashboards-sidebar__nav">
			<UiListItem
				v-tooltip:right="collapsed ? 'Dashboards' : ''"
				:to="`/dashboards/${connectionId}`"
				:active="activeTab === 'dashboards'"
				:class="{ 'dashboards-sidebar__item--active': activeTab === 'dashboards' }"
			>
				<template #leading><UiIcon name="dashboard" /></template>
				<span :class="{ 'dashboards-sidebar__label--hidden': collapsed }">Dashboards</span>
			</UiListItem>
			<UiListItem
				v-tooltip:right="collapsed ? 'Panels' : ''"
				:to="`/panels/${connectionId}`"
				:active="activeTab === 'queries'"
				:class="{ 'dashboards-sidebar__item--active': activeTab === 'queries' }"
			>
				<template #leading><UiIcon name="widgets" /></template>
				<span :class="{ 'dashboards-sidebar__label--hidden': collapsed }">Panels</span>
			</UiListItem>
		</UiList>
	</aside>
</template>

<style scoped>
.dashboards-sidebar {
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	width: 13.75rem;
	height: 100%;
	overflow: hidden;
	border-right: 1px solid var(--color-line);
	background: var(--color-surface);
}

.dashboards-sidebar--initialized {
	transition: width var(--motion-base) var(--ease-out);
}

.dashboards-sidebar--collapsed {
	width: 3.5rem;
}

.dashboards-sidebar__toggle {
	align-self: flex-start;
	margin: var(--space-2) var(--space-3);
}

.dashboards-sidebar__toggle--collapsed {
	align-self: center;
	margin: var(--space-3) var(--space-2);
}

.dashboards-sidebar__nav {
	padding: 0 var(--space-2);
}

.dashboards-sidebar__item--active :deep(.ui-list-item__leading) {
	color: var(--color-accent);
}

/* Collapsed, the label stays as the link's accessible name but takes no space. */
.dashboards-sidebar__label--hidden {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}

@media (width <= 600px) {
	.dashboards-sidebar {
		display: none;
	}
}
</style>
