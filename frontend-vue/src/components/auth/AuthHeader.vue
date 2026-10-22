<script setup lang="ts">
// The logo + "Welcome … Rocketadmin" heading shared by the login and setup pages. The default slot
// holds the directions under the heading.
withDefaults(
	defineProps<{
		/** Words before the emphasised "Rocketadmin". */
		greeting?: string;
	}>(),
	{ greeting: 'Welcome to' },
);
</script>

<template>
	<div class="auth-header">
		<svg class="auth-header__logo" width="56" height="54" viewBox="0 0 56 54" fill="none" role="img">
			<title>Rocketadmin logo</title>
			<path
				d="M47.2367 17.9125H35.1499C33.3671 17.9125 32.4833 16.5678 33.1783 14.9286L37.5295 4.71527C38.5191 2.39612 37.2651 0.5 34.742 0.5H23.4711C22.3682 0.5 21.1142 1.33097 20.6836 2.34323L15.4485 14.634C14.5798 16.6661 15.6827 18.328 17.8885 18.328H29.4465C30.7231 18.328 31.8789 19.0909 32.3775 20.2618L37.5295 32.3486C38.232 33.9954 37.3406 35.3401 35.5578 35.3401H8.62703C7.52411 35.3401 6.27011 36.1711 5.83952 37.1833L0.823517 48.9453C-0.166086 51.2644 1.08792 53.1605 3.61103 53.1605H29.8242C30.9271 53.1605 32.1811 52.3296 32.6117 51.3173L38.4435 37.629C38.9346 36.4808 40.0526 35.7405 41.299 35.7405H52.6833C54.9722 35.7405 56.1053 34.0181 55.2064 31.918L50.0242 19.7633C49.5936 18.751 48.3396 17.92 47.2367 17.92V17.9125Z"
				fill="currentColor"
			/>
		</svg>
		<h1 class="auth-header__title">
			{{ greeting }} <br>
			<span class="auth-header__emphasis">Rocketadmin</span>
		</h1>
		<div v-if="$slots.default" class="auth-header__directions">
			<slot />
		</div>
	</div>
</template>

<style scoped>
.auth-header {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-bottom: var(--space-10);
	text-align: center;
}

.auth-header__logo {
	width: 2.75rem;
	height: auto;
	margin-bottom: var(--space-8);
	color: var(--color-ink);
}

.auth-header__title {
	margin: 0 0 var(--space-10);
	font-family: var(--font-display);
	font-size: var(--text-2xl);
	font-weight: var(--weight-semibold);
	line-height: var(--leading-tight);
	color: var(--color-ink);
}

.auth-header__emphasis {
	color: var(--color-accent);
}

.auth-header__directions {
	color: var(--color-muted);
	line-height: var(--leading-normal);
}

@media (width <= 600px) {
	.auth-header {
		padding-bottom: 0;
	}

	.auth-header__logo {
		margin-bottom: var(--space-3);
	}

	.auth-header__directions {
		display: none;
	}
}
</style>
