<script setup lang="ts">
/**
 * Collapsible section — the `mat-expansion-panel` replacement (the connection forms' "Advanced
 * settings", the row-edit related-records list). Group several in a `UiAccordion` for one-open-at-
 * a-time behaviour.
 *
 * APG disclosure/accordion pattern: the header is a real `<button>` with `aria-expanded` and
 * `aria-controls`, and the content is a `role="region"` labelled by that button. `headingLevel`
 * wraps the button in an `<hN>` when the panel titles belong in the page outline.
 *
 * The `actions` slot sits in the header row but **outside** the button — interactive content
 * (the related-records "add" and "open" links) cannot legally live inside a `<button>`. Clicks on
 * the rest of the header row toggle, like Material's whole-header hit area; clicks in `actions` do
 * not.
 *
 * Content is kept in the DOM while collapsed (hidden), so form fields inside an "Advanced
 * settings" panel keep their state and still submit. `lazy` defers the first render until the
 * panel first opens, for expensive content such as a fetched list.
 */
import { computed, inject, onBeforeUnmount, ref, useId, watch } from 'vue';
import { ACCORDION_CONTEXT } from './accordionContext';
import UiIcon from './UiIcon.vue';

const props = withDefaults(
	defineProps<{
		/** Header text. The `title` slot, when given, replaces it. */
		title?: string;
		/** Secondary header text after the title (`mat-panel-description`). The `description` slot replaces it. */
		description?: string;
		/** The header cannot be toggled; the panel stays in its current state. */
		disabled?: boolean;
		/** Hides the chevron, e.g. for a panel with nothing to show. */
		hideToggle?: boolean;
		/** Wraps the header button in an `<h2>`…`<h6>`. Omitted, no heading is added. */
		headingLevel?: 2 | 3 | 4 | 5 | 6;
		/** Renders the content only once the panel has first been opened. */
		lazy?: boolean;
	}>(),
	{ disabled: false, hideToggle: false, lazy: false },
);

/** Expanded state. Optional two-way `v-model:open`; uncontrolled when not bound. */
const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{ opened: []; closed: [] }>();

const uid = useId();
const headerId = `${uid}-header`;
const contentId = `${uid}-content`;

const accordion = inject(ACCORDION_CONTEXT, undefined);
accordion?.register(uid, () => {
	open.value = false;
});
onBeforeUnmount(() => accordion?.unregister(uid));

/** Whether the content has ever been rendered, for `lazy`. */
const rendered = ref(open.value || !props.lazy);

watch(
	open,
	(isOpen) => {
		if (isOpen) {
			rendered.value = true;
			accordion?.opened(uid);
			emit('opened');
		} else {
			emit('closed');
		}
	},
	{ flush: 'sync' },
);

// A panel mounted open inside a single-open accordion still claims the slot.
if (open.value) accordion?.opened(uid);

const headingTag = computed(() => (props.headingLevel ? `h${props.headingLevel}` : 'div'));

const classes = computed(() => [
	'ui-expansion-panel',
	{ 'ui-expansion-panel--open': open.value, 'ui-expansion-panel--disabled': props.disabled },
]);

function toggle() {
	if (props.disabled) return;
	open.value = !open.value;
}
</script>

<template>
	<div :class="classes">
		<!-- The row takes the click so the chevron and padding toggle too; the button is what keyboard
         and AT use, and its own click bubbles here, so it needs no handler of its own. -->
		<div class="ui-expansion-panel__header" @click="toggle">
			<component :is="headingTag" class="ui-expansion-panel__heading">
				<button
					:id="headerId"
					type="button"
					class="ui-expansion-panel__toggle"
					:aria-expanded="open ? 'true' : 'false'"
					:aria-controls="contentId"
					:disabled="disabled"
				>
					<span class="ui-expansion-panel__title"><slot name="title">{{ title }}</slot></span>
					<span v-if="description || $slots.description" class="ui-expansion-panel__description">
						<slot name="description">{{ description }}</slot>
					</span>
				</button>
			</component>
			<div v-if="$slots.actions" class="ui-expansion-panel__actions" @click.stop>
				<slot name="actions" />
			</div>
			<UiIcon v-if="!hideToggle" class="ui-expansion-panel__chevron" name="expand_more" />
		</div>
		<div
			v-show="open"
			:id="contentId"
			class="ui-expansion-panel__content"
			role="region"
			:aria-labelledby="headerId"
		>
			<slot v-if="rendered" />
		</div>
	</div>
</template>

<style scoped>
.ui-expansion-panel {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  transition: box-shadow var(--motion-fast) var(--ease-out);
}

.ui-expansion-panel--open {
  box-shadow: var(--shadow-card);
}

.ui-expansion-panel__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-inline-end: var(--space-4);
  cursor: pointer;
}

.ui-expansion-panel--disabled .ui-expansion-panel__header {
  cursor: default;
}

.ui-expansion-panel__heading {
  flex: 1;
  min-width: 0;
  margin: 0;
  font: inherit;
}

.ui-expansion-panel__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
  padding: var(--space-4) var(--space-2) var(--space-4) var(--space-5);
  border: 0;
  border-radius: var(--radius-card);
  background: transparent;
  font: inherit;
  text-align: start;
  color: var(--color-ink);
  cursor: inherit;
}

.ui-expansion-panel__toggle:focus-visible {
  outline: none;
  box-shadow: inset var(--ring-focus);
}

.ui-expansion-panel__toggle:disabled {
  color: var(--color-muted);
}

.ui-expansion-panel__title {
  flex-shrink: 0;
  max-width: 100%;
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
}

.ui-expansion-panel__description {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.ui-expansion-panel__actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  cursor: default;
}

.ui-expansion-panel__chevron {
  color: var(--color-muted);
  transition: transform var(--motion-fast) var(--ease-out);
}

.ui-expansion-panel--open .ui-expansion-panel__chevron {
  transform: rotate(180deg);
}

.ui-expansion-panel--disabled .ui-expansion-panel__chevron {
  opacity: 0.5;
}

.ui-expansion-panel__content {
  padding: 0 var(--space-5) var(--space-5);
}
</style>
