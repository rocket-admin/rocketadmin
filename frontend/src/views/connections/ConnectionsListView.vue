<script setup lang="ts">
// Port of frontend/src/app/components/connections-list: the company name (with an edit link for
// the account owner) over the user's connections. The shell loads the connections list
// (connectionsStore.connectionsVersion); this page shows the skeleton until it has arrived.
import { ref, watch } from 'vue';
import OwnConnections from '@/components/connections/OwnConnections.vue';
import AppAlert from '@/components/shared/AppAlert.vue';
import PlaceholderConnections from '@/components/skeletons/PlaceholderConnections.vue';
import { UiIconButton, UiSkeleton } from '@/components/ui';
import { CompanyMemberRole } from '@/models/company';
import { useCompanyStore } from '@/stores/company';
import { useConnectionsStore } from '@/stores/connections';
import { useUserStore } from '@/stores/user';

const connections = useConnectionsStore();
const user = useUserStore();
const company = useCompanyStore();

const companyName = ref<string | null>(null);

document.title = 'Connections | Rocketadmin';

watch(
	() => user.currentUser?.company?.id,
	async (companyId) => {
		if (!user.currentUser?.id || !companyId) return;
		try {
			companyName.value = (await company.fetchCompanyName(companyId)).name;
		} catch {
			// The store has shown the error.
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div class="connections-list">
		<AppAlert class="connections-list__alert" />

		<div v-if="companyName" class="connections-list__header">
			<div class="connections-list__title">
				<h1 class="connections-list__name" data-testid="company-name">{{ companyName }}</h1>
				<UiIconButton
					v-if="user.currentUser?.role === CompanyMemberRole.CAO"
					icon="edit"
					label="Edit company"
					to="/company"
					class="connections-list__edit"
				/>
			</div>
		</div>
		<div v-else class="connections-list__header">
			<UiSkeleton width="18vw" height="2.5rem" class="connections-list__name-skeleton" label="Loading company" />
		</div>

		<OwnConnections
			v-if="connections.ownConnections !== null"
			:current-user="user.currentUser"
			:connections="connections.ownConnections"
			:company-id="user.currentUser?.company?.id"
		/>
		<PlaceholderConnections v-else class="connections-list__placeholder" />
	</div>
</template>

<style scoped>
.connections-list {
	display: flex;
	flex-direction: column;
	align-items: center;
	min-height: 100%;
	padding: var(--space-16) max(calc(50vw - 535px), 10%);
	background-image:
		url('/assets/bg/connections-list-left-decoration.svg'), url('/assets/bg/connections-list-right-decoration.svg');
	background-repeat: no-repeat, no-repeat;
	background-position:
		left 125%,
		right -26%;
	background-size: 17%, 18%;
}

.connections-list__alert {
	margin-bottom: var(--space-6);
	width: 100%;
}

.connections-list__header {
	position: relative;
	display: flex;
	justify-content: center;
	margin-bottom: var(--space-12);
	width: 100%;
	text-align: center;
}

.connections-list__title {
	position: relative;
	display: inline-block;
}

.connections-list__name {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-2xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.connections-list__edit {
	position: absolute;
	top: 50%;
	right: calc(-1 * var(--space-12));
	transform: translateY(-50%);
	opacity: 0;
	transition: opacity var(--motion-base) var(--ease-out);
}

.connections-list__title:hover .connections-list__edit,
.connections-list__edit:focus-visible {
	opacity: 1;
}

.connections-list__placeholder {
	width: 100%;
}

@media (prefers-color-scheme: dark) {
	.connections-list {
		background-image:
			url('/assets/bg/connections-list-left-decoration_dark.svg'),
			url('/assets/bg/connections-list-right-decoration_dark.svg');
	}
}

@media (width <= 600px) {
	.connections-list {
		padding: var(--space-12) 9vw;
		width: 100%;
	}

	.connections-list__header {
		margin-bottom: var(--space-8);
	}

	.connections-list__name {
		font-size: var(--text-xl);
		line-height: var(--leading-tight);
	}

	.connections-list__edit {
		opacity: 1;
	}
}
</style>
