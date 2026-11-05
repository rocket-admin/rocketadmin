<script setup lang="ts">
// The `.profile-layout` frame the account pages (user settings, company, secrets, API keys, Zapier)
// shared in Angular: the profile sidebar, then a scrolling main column with the page alert on top.
import AppAlert from '@/components/shared/AppAlert.vue';
import ProfileSidebar, { type ProfileTab } from './ProfileSidebar.vue';

defineProps<{
	/** The page shown; its sidebar link is highlighted. */
	activeTab: ProfileTab;
}>();
</script>

<template>
	<div class="profile-layout">
		<ProfileSidebar :active-tab="activeTab" />
		<main class="profile-layout__main">
			<AppAlert class="profile-layout__alert" />
			<slot name="alerts" />
			<slot />
		</main>
	</div>
</template>

<style scoped>
.profile-layout {
	display: flex;
	height: calc(100vh - var(--header-height));
}

.profile-layout__main {
	flex: 1;
	min-width: 0;
	overflow-y: auto;
	background: var(--color-paper);
}

.profile-layout__main > .profile-layout__alert,
.profile-layout__main > :slotted(.profile-layout__alert) {
	position: relative;
	top: 0;
	margin: var(--space-6);
}
</style>
