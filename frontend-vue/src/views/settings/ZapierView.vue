<script setup lang="ts">
// Port of frontend/src/app/components/zapier (/zapier, SaaS): Zapier's embeddable workflow element,
// loaded from Zapier's CDN once per page load.
//
// `<zapier-workflow>` is a custom element. It is created here rather than written in the template,
// so the Vue compiler needs no `isCustomElement` option, and its inputs are set as DOM properties,
// as Angular's `[signUpEmail]` bindings did.
import { computed, onMounted, ref, watch } from 'vue';
import ProfileLayout from '@/components/profile/ProfileLayout.vue';
import { UiButton, UiIcon } from '@/components/ui';
import { useUserStore } from '@/stores/user';

const ZAPIER_CDN_BASE = 'https://cdn.zapier.com/packages/partner-sdk/v0/zapier-elements';
const ZAPIER_CLIENT_ID = '4MFV3OrjI8e8JkZPySqbFVbKtZUz0sV0H3XJnb6w';

const userStore = useUserStore();
const email = computed(() => userStore.currentUser?.email);
const container = ref<HTMLElement | null>(null);

onMounted(() => {
	loadZapierElements();
	if (!userStore.currentUser) userStore.fetchUser().catch(() => {});
});

watch([container, email], renderWorkflow, { immediate: true });

function renderWorkflow() {
	const host = container.value;
	if (!host) return;
	host.replaceChildren();
	if (!email.value) return;
	const workflow = Object.assign(document.createElement('zapier-workflow'), {
		signUpEmail: email.value,
		clientId: ZAPIER_CLIENT_ID,
		theme: 'auto',
		introCopyDisplay: 'show',
		guessZapDisplay: 'show',
		zapCreateFromScratchDisplay: 'hide',
	});
	host.appendChild(workflow);
}

function loadZapierElements() {
	if (!document.querySelector(`script[src="${ZAPIER_CDN_BASE}/zapier-elements.esm.js"]`)) {
		const script = document.createElement('script');
		script.type = 'module';
		script.src = `${ZAPIER_CDN_BASE}/zapier-elements.esm.js`;
		document.head.appendChild(script);
	}

	if (!document.querySelector(`link[href="${ZAPIER_CDN_BASE}/zapier-elements.css"]`)) {
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = `${ZAPIER_CDN_BASE}/zapier-elements.css`;
		document.head.appendChild(link);
	}
}
</script>

<template>
	<ProfileLayout active-tab="zapier">
		<div class="zapier">
			<UiButton variant="secondary" href="https://docs.rocketadmin.com/Integrations/Zapier" class="zapier__docs">
				<template #leading><UiIcon name="open_in_new" size="sm" /></template>
				Docs
			</UiButton>
			<div ref="container" class="zapier__workflow" data-testid="zapier-workflow-host" />
		</div>
	</ProfileLayout>
</template>

<style scoped>
.zapier {
	display: flex;
	flex-direction: column;
	max-width: 1200px;
	margin: var(--space-10) auto;
	padding: 0 clamp(var(--space-10), 5vw, 100px);
}

.zapier__docs {
	align-self: flex-end;
	margin-bottom: calc(-1 * var(--space-10));
}
</style>
