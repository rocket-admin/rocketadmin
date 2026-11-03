<script setup lang="ts" generic="T">
/**
 * Text input with a suggestion list — the `mat-autocomplete` replacement (foreign keys, countries,
 * languages, timezones, currencies).
 *
 * The APG "combobox with listbox popup" pattern: focus stays in the `<input>`, ArrowUp/ArrowDown
 * move a virtual cursor exposed through `aria-activedescendant`, Enter picks, Escape closes. The
 * list renders in the top layer (`popover="manual"`, like `UiMenu`), so it is not clipped by a
 * scrolling dialog body.
 *
 * Filtering is the caller's: `v-model` is the typed text, `options` is what to show for it. Every
 * Angular autocomplete filtered differently (prefix, substring, server-side with a debounce), so
 * baking one strategy in would only be overridden. Picking an option emits `select` with it and
 * sets the text to its label.
 *
 * The `option` slot renders a row's content (a flag before a country name); its default is the
 * label. The `leading` / `trailing` slots sit inside the control's border, like `matPrefix` /
 * `matSuffix`.
 */
import { computed, inject, nextTick, onBeforeUnmount, ref, useAttrs, useId, watch } from 'vue';
import { FIELD_CONTEXT } from './fieldContext';
import type { AutocompleteOption } from './selectOption';
import UiSpinner from './UiSpinner.vue';

const props = withDefaults(
	defineProps<{
		/** The text in the input. */
		modelValue?: string | null;
		/** Suggestions for the current text, already filtered by the caller. */
		options: AutocompleteOption<T>[];
		/** Shows a spinner in the control while suggestions load. */
		loading?: boolean;
		/** Highlights the first option as the list opens, so Enter picks it (`autoActiveFirstOption`). */
		autoActiveFirst?: boolean;
		/** Shown as a non-selectable row when `options` is empty and the input is not. */
		emptyText?: string;
		placeholder?: string;
		/** Geometry only. */
		size?: 'sm' | 'md';
		disabled?: boolean;
		readonly?: boolean;
		/** Set explicitly only when used outside a `UiField`, which otherwise supplies it. */
		invalid?: boolean;
	}>(),
	{ loading: false, autoActiveFirst: false, size: 'md', disabled: false, readonly: false, invalid: undefined },
);

const emit = defineEmits<{
	'update:modelValue': [string];
	/** An option was picked, by click or Enter. */
	select: [AutocompleteOption<T>];
}>();

defineSlots<{
	option?(props: { option: AutocompleteOption<T>; active: boolean }): unknown;
	leading?(): unknown;
	trailing?(): unknown;
}>();

const field = inject(FIELD_CONTEXT, undefined);

// `class` / `style` are layout passthrough and belong on the bordered root, which is the box a
// caller sizes; everything else (`name`, `aria-label`, `data-*`) belongs on the <input>.
const attrs = useAttrs();
// Functions, not computeds: `attrs` is not reactive, so a computed would cache a stale copy.
function rootAttrs() {
	return { class: attrs.class, style: attrs.style };
}
function inputAttrs() {
	const { class: _class, style: _style, ...rest } = attrs;
	return rest;
}
const uid = useId();
const listId = `${uid}-listbox`;
const optionId = (index: number) => `${uid}-option-${index}`;

const root = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const open = ref(false);
const activeIndex = ref(-1);
const coords = ref<{ top: string; left: string; width: string } | undefined>(undefined);

const isInvalid = computed(() => props.invalid ?? field?.invalid.value ?? false);
const showEmpty = computed(() => !props.loading && props.options.length === 0 && Boolean(props.emptyText));
const expanded = computed(() => open.value && (props.options.length > 0 || showEmpty.value));

const classes = computed(() => [
	'ui-autocomplete',
	`ui-autocomplete--size-${props.size}`,
	{ 'ui-autocomplete--invalid': isInvalid.value, 'ui-autocomplete--disabled': props.disabled },
]);

watch(
	() => props.options,
	() => {
		activeIndex.value = props.autoActiveFirst ? firstEnabled(0, 1) : -1;
	},
);

watch(expanded, async (isExpanded) => {
	if (isExpanded) {
		await nextTick();
		show();
	} else {
		hide();
	}
});

onBeforeUnmount(() => hide());

function openList() {
	if (props.disabled || props.readonly) return;
	open.value = true;
	if (activeIndex.value < 0 && props.autoActiveFirst) activeIndex.value = firstEnabled(0, 1);
}

function closeList() {
	open.value = false;
	activeIndex.value = -1;
}

function onInput(event: Event) {
	emit('update:modelValue', (event.target as HTMLInputElement).value);
	openList();
}

function pick(option: AutocompleteOption<T>) {
	if (option.disabled) return;
	emit('update:modelValue', option.label);
	emit('select', option);
	closeList();
}

function onKeydown(event: KeyboardEvent) {
	switch (event.key) {
		case 'ArrowDown':
			event.preventDefault();
			if (!open.value) {
				openList();
				if (!open.value) return;
				// `autoActiveFirst` already highlighted the first option; stepping again would skip it.
				if (activeIndex.value >= 0) return;
			}
			move(1);
			return;
		case 'ArrowUp':
			event.preventDefault();
			if (!open.value) {
				openList();
				if (!open.value) return;
				// Opening upward lands on the last option, as in the APG combobox.
				activeIndex.value = -1;
			}
			move(-1);
			return;
		case 'Enter': {
			const option = props.options[activeIndex.value];
			if (open.value && option) {
				event.preventDefault();
				pick(option);
			}
			return;
		}
		case 'Escape':
			if (open.value) {
				event.preventDefault();
				// Inside a UiModal, Escape closes the list, not the dialog.
				event.stopPropagation();
				closeList();
			}
			return;
		case 'Tab':
			closeList();
			return;
	}
}

function move(step: 1 | -1) {
	const start = activeIndex.value < 0 ? (step === 1 ? 0 : props.options.length - 1) : activeIndex.value + step;
	activeIndex.value = firstEnabled(start, step);
	nextTick(() => {
		document.getElementById(optionId(activeIndex.value))?.scrollIntoView?.({ block: 'nearest' });
	});
}

/** The first enabled option from `start` walking by `step`, wrapping; -1 when none. */
function firstEnabled(start: number, step: 1 | -1): number {
	const count = props.options.length;
	for (let offset = 0; offset < count; offset++) {
		const index = (((start + offset * step) % count) + count) % count;
		if (!props.options[index]?.disabled) return index;
	}
	return -1;
}

function onDocumentPointerdown(event: PointerEvent) {
	const target = event.target as Node;
	if (root.value?.contains(target) || panel.value?.contains(target)) return;
	closeList();
}

function show() {
	const el = panel.value;
	if (!el) return;
	if (!el.matches?.(':popover-open')) callPopover(el, 'showPopover');
	place();
	document.addEventListener('pointerdown', onDocumentPointerdown, true);
	window.addEventListener('resize', place);
	window.addEventListener('scroll', place, true);
}

function hide() {
	const el = panel.value;
	if (el?.matches?.(':popover-open')) callPopover(el, 'hidePopover');
	document.removeEventListener('pointerdown', onDocumentPointerdown, true);
	window.removeEventListener('resize', place);
	window.removeEventListener('scroll', place, true);
}

/** Gap between control and list, in px — `--space-1`. */
const OFFSET = 4;

function place() {
	const anchor = root.value;
	const el = panel.value;
	if (!anchor || !el) return;
	const rect = anchor.getBoundingClientRect();
	const height = el.offsetHeight;
	let top = rect.bottom + OFFSET;
	if (top + height > window.innerHeight && rect.top - OFFSET - height >= 0) top = rect.top - OFFSET - height;
	coords.value = { top: `${top}px`, left: `${rect.left}px`, width: `${rect.width}px` };
}

function callPopover(el: HTMLElement, method: 'showPopover' | 'hidePopover') {
	const fn = (el as Partial<Pick<HTMLElement, 'showPopover' | 'hidePopover'>>)[method];
	try {
		fn?.call(el);
	} catch {
		// Already in the requested state, or detached mid-transition.
	}
}

defineExpose({ focus: () => input.value?.focus() });
</script>

<script lang="ts">
export default {
  inheritAttrs: false,
}
</script>

<template>
	<div ref="root" v-bind="rootAttrs()" :class="classes">
		<span v-if="$slots.leading" class="ui-autocomplete__adornment"><slot name="leading" /></span>
		<input
			v-bind="inputAttrs()"
			:id="field?.inputId"
			ref="input"
			class="ui-autocomplete__input"
			type="text"
			role="combobox"
			autocomplete="off"
			aria-autocomplete="list"
			:aria-controls="listId"
			:aria-expanded="expanded ? 'true' : 'false'"
			:aria-activedescendant="expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined"
			:value="modelValue ?? ''"
			:placeholder="placeholder"
			:disabled="disabled"
			:readonly="readonly"
			:required="field?.required.value || undefined"
			:aria-describedby="field?.describedBy.value"
			:aria-invalid="isInvalid ? 'true' : undefined"
			@input="onInput"
			@focus="openList"
			@click="openList"
			@keydown="onKeydown"
		>
		<UiSpinner v-if="loading" class="ui-autocomplete__spinner" size="sm" label="Loading suggestions" />
		<span v-if="$slots.trailing" class="ui-autocomplete__adornment"><slot name="trailing" /></span>

		<ul
			v-show="expanded"
			:id="listId"
			ref="panel"
			class="ui-autocomplete__panel"
			role="listbox"
			popover="manual"
			:style="coords"
		>
			<li
				v-for="(option, index) in options"
				:id="optionId(index)"
				:key="index"
				class="ui-autocomplete__option"
				:class="{
					'ui-autocomplete__option--active': index === activeIndex,
					'ui-autocomplete__option--disabled': option.disabled,
				}"
				role="option"
				:aria-selected="index === activeIndex ? 'true' : 'false'"
				:aria-disabled="option.disabled ? 'true' : undefined"
				@pointerdown.prevent
				@click="pick(option)"
				@pointermove="!option.disabled && (activeIndex = index)"
			>
				<slot name="option" :option="option" :active="index === activeIndex">{{ option.label }}</slot>
			</li>
			<li v-if="showEmpty" class="ui-autocomplete__empty" role="option" aria-disabled="true" aria-selected="false">
				{{ emptyText }}
			</li>
		</ul>
	</div>
</template>

<style scoped>
.ui-autocomplete {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  transition:
    border-color var(--motion-fast),
    box-shadow var(--motion-fast);
}

.ui-autocomplete--size-md {
  padding: 0 var(--space-3);
  font-size: var(--text-base);
}

.ui-autocomplete--size-sm {
  padding: 0 var(--space-2);
  font-size: var(--text-sm);
}

.ui-autocomplete:focus-within {
  border-color: var(--color-accent);
  box-shadow: var(--ring-focus);
}

.ui-autocomplete--invalid,
.ui-autocomplete--invalid:focus-within {
  border-color: var(--color-danger-strong);
}

.ui-autocomplete--invalid:focus-within {
  box-shadow: var(--ring-danger);
}

.ui-autocomplete--disabled {
  opacity: 0.65;
  background: var(--color-paper);
}

.ui-autocomplete__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  font: inherit;
  color: var(--color-ink);
}

.ui-autocomplete--size-md .ui-autocomplete__input {
  padding: 0.625rem var(--space-0);
}

.ui-autocomplete--size-sm .ui-autocomplete__input {
  padding: var(--space-2) 0;
}

.ui-autocomplete__input::placeholder {
  color: var(--color-muted-soft);
}

.ui-autocomplete__input:disabled {
  cursor: not-allowed;
}

.ui-autocomplete__adornment {
  display: inline-flex;
  align-items: center;
  color: var(--color-muted);
}

.ui-autocomplete__panel {
  position: fixed;
  inset: auto;
  z-index: var(--z-dropdown);
  max-height: min(18rem, calc(100vh - var(--space-8)));
  margin: 0;
  padding: var(--space-1);
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--color-ink);
  box-shadow: var(--shadow-card);
}

.ui-autocomplete__option,
.ui-autocomplete__empty {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-control);
  font-size: var(--text-sm);
}

.ui-autocomplete__option {
  cursor: pointer;
}

.ui-autocomplete__option--active {
  background: var(--color-paper-2);
}

.ui-autocomplete__option--disabled,
.ui-autocomplete__empty {
  color: var(--color-muted);
  cursor: default;
}
</style>
