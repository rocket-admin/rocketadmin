<script setup lang="ts">
// Port of frontend/src/app/components/ui-components/banner (BannerComponent).
//
// A full-height, centred status card for page-level states that replace the page: a server error
// loading a connection, "no tables found", an invalid invitation link, "account deleted". The
// Angular call sites put their buttons in a `.error-actions` div styled through ::ng-deep; here that
// row is the `actions` slot. `type` is optional — company-member-invitation renders one without.
//
// Deviation: the Angular wrapper painted `assets/bg/banner.svg` behind the card. The SiteNova look
// has no such decoration, so the card sits on the page's paper background.
import { computed } from 'vue';
import type { AlertType } from '@/models/alert';

const props = defineProps<{
	/** Status colour of the card's edge and background. Omitted, the card is neutral. */
	type?: AlertType;
}>();

const boxClasses = computed(() => ['app-banner__box', `app-banner__box--${props.type ?? 'neutral'}`]);
</script>

<template>
	<div class="app-banner">
		<div :class="boxClasses">
			<slot />
			<div v-if="$slots.actions" class="app-banner__actions">
				<slot name="actions" />
			</div>
		</div>
	</div>
</template>

<style scoped>
.app-banner {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	min-height: 60vh;
	padding: var(--space-6) var(--space-4);
}

.app-banner__box {
	width: clamp(18.75rem, 50vw, 28rem);
	padding: var(--space-6) var(--space-5) var(--space-6) var(--space-6);
	border: 1px solid var(--color-line);
	border-inline-start-width: var(--space-2);
	border-radius: var(--radius-panel);
	background: var(--color-surface);
	box-shadow: var(--shadow-card);
	color: var(--color-ink-soft);
	line-height: var(--leading-normal);
}

/* The call sites' copy is <p>/<h1>/<h3>; trim the outer margins so the padding is the frame. */
.app-banner__box > :slotted(:first-child) {
	margin-top: 0;
}

.app-banner__box > :slotted(:last-child) {
	margin-bottom: 0;
}

.app-banner__box--error {
	border-color: var(--color-danger-border);
	border-inline-start-color: var(--color-danger);
	background: var(--color-danger-bg);
}

.app-banner__box--warning {
	border-color: var(--color-warning-border);
	border-inline-start-color: var(--color-warning);
	background: var(--color-warning-bg);
}

.app-banner__box--success {
	border-color: var(--color-success-border);
	border-inline-start-color: var(--color-success);
	background: var(--color-success-bg);
}

.app-banner__box--info {
	border-inline-start-color: var(--color-accent);
	background: var(--color-paper-2);
}

.app-banner__box--neutral {
	border-inline-start-color: var(--color-line-strong);
}

.app-banner__actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: var(--space-3);
	margin-top: var(--space-8);
}
</style>
