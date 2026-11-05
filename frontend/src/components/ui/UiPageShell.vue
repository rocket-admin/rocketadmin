<script setup lang="ts">
/**
 * The page wrapper. Absorbs both the 9 duplicated page backgrounds *and* the width box they always
 * wrapped — `.panel` (44rem, ×4 byte-identical) and `.auth-card`'s max-width (26rem, ×4). They were
 * never used apart, so one component owns both.
 *
 * `background: var(--color-paper)` is what silently fixed the two off-brand page backgrounds the
 * pre-rebrand views hard-coded.
 *
 * **Not** a layout engine: Dashboard's and WebsiteDetail's split-pane grid is one-off app layout for
 * two call sites and stays in those views.
 */
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		/** `top` = app pages, content starts below the header. `center` = auth pages, vertically centred. */
		align?: 'top' | 'center';
		/** Content column: `panel` = 44rem, `auth` = 26rem, `full` = unconstrained. */
		width?: 'panel' | 'auth' | 'full';
		/**
		 * Root element. `main` when the shell *is* the page's main landmark, which is the common case
		 * for a view — it saves every view wrapping the shell in a redundant `<main>`.
		 *
		 * Deliberately a closed union of landmark-capable elements, not the generic polymorphic `as`
		 * the plan rejected: `as: string` would erase the check that makes `as="span"` a type error.
		 */
		as?: 'div' | 'main' | 'section';
	}>(),
	{ align: 'top', width: 'panel', as: 'div' },
);

const classes = computed(() => [
	'ui-page-shell',
	`ui-page-shell--align-${props.align}`,
	`ui-page-shell--width-${props.width}`,
]);
</script>

<template>
	<component :is="as" :class="classes">
		<div class="ui-page-shell__content">
			<slot />
		</div>
	</component>
</template>

<style scoped>
.ui-page-shell {
  display: grid;
  background: var(--color-paper);
}

/* `start center` rather than `center`: app pages read from the top, and centring a short page
   would drop its heading into the middle of the viewport. */
.ui-page-shell--align-top {
  place-items: start center;
  padding: var(--space-8) var(--space-4) var(--space-16);
}

.ui-page-shell--align-center {
  place-items: center;
  padding: var(--space-8) var(--space-4);
}

.ui-page-shell__content {
  width: 100%;
  /* A grid item's automatic minimum is its content's min-content width, not zero. Without this, one
     unbreakable line inside a page (a long site name, set to `nowrap` + ellipsis) widened the
     track and the page scrolled sideways on mobile instead of the line truncating. */
  min-width: 0;
}

.ui-page-shell--width-panel .ui-page-shell__content {
  max-width: var(--width-panel);
}

.ui-page-shell--width-auth .ui-page-shell__content {
  max-width: var(--width-auth-card);
}
</style>
