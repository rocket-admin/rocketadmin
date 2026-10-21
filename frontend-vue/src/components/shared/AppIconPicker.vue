<script setup lang="ts">
// Port of frontend/src/app/components/ui-components/icon-picker (IconPickerComponent).
//
// A button ("Add icon" / "Change icon", tooltip via `title`) opening a small panel: a grid of
// suggested icons as radio buttons, a free-text Material Symbols name with Apply, and Remove when
// `resetButtonShown` and an icon is set. Emits `change` with the icon name, or `null` for Remove —
// the Angular `onFieldChange` output.
//
// Angular put this inside a mat-menu, which closes on any click inside it except where the custom
// input stopped propagation; the same effect here: clicking a suggestion, Apply and Remove close the
// panel, typing doesn't, and arrowing through the suggestions emits each without closing. The panel is a non-modal `role="dialog"` rather than a UiMenu — its contents
// are radios and a text field, which `role="menu"` may not contain. Escape and an outside click
// close it; focus moves in on open and back to the button on Escape.
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { UiButton, UiField, UiIcon, UiInput } from '@/components/ui';

const props = withDefaults(
	defineProps<{
		/** The current icon name, if any. */
		icon?: string | null;
		/** Suggested icons shown as a grid. */
		defaultIcons?: string[];
		/** Tooltip on the trigger button. */
		tooltip?: string;
		/** Shows "Remove" (emitting `null`) while an icon is set. */
		resetButtonShown?: boolean;
	}>(),
	{ icon: null, defaultIcons: () => [], resetButtonShown: false },
);

const emit = defineEmits<{ change: [string | null] }>();

const uid = useId();
const panelId = `${uid}-panel`;
const radioName = `${uid}-icon`;

const open = ref(false);
const selected = ref<string | null>(props.icon);
const customIcon = ref(props.icon ?? '');
const root = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const trigger = ref<InstanceType<typeof UiButton> | null>(null);

watch(
	() => props.icon,
	(icon) => {
		selected.value = icon;
	},
);

const triggerLabel = computed(() => (props.icon ? 'Change icon' : 'Add icon'));

onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerdown, true));

async function toggle() {
	if (open.value) {
		close();
		return;
	}
	open.value = true;
	document.addEventListener('pointerdown', onDocumentPointerdown, true);
	await nextTick();
	const first =
		panel.value?.querySelector<HTMLInputElement>('input[type="radio"]:checked') ??
		panel.value?.querySelector<HTMLInputElement>('input, button');
	first?.focus();
}

function close(returnFocus = false) {
	open.value = false;
	document.removeEventListener('pointerdown', onDocumentPointerdown, true);
	if (returnFocus) (trigger.value?.$el as HTMLElement | undefined)?.focus();
}

/** Every selection change emits, as Angular's `ngModelChange` did. */
function pick(icon: string) {
	selected.value = icon;
	emit('change', icon);
}

/**
 * Only a pointer click closes the panel. Arrow keys inside a radio group also dispatch `click`
 * (with `detail === 0`), and closing on those would shut the panel on the first arrow press.
 */
function onOptionClick(event: MouseEvent) {
	if (event.detail > 0) close(true);
}

function applyIcon() {
	if (!customIcon.value) return;
	emit('change', customIcon.value);
	close(true);
}

function resetIcon() {
	emit('change', null);
	close(true);
}

function onPanelKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		event.preventDefault();
		event.stopPropagation();
		close(true);
	}
}

function onDocumentPointerdown(event: PointerEvent) {
	if (root.value && !root.value.contains(event.target as Node)) close();
}
</script>

<template>
	<div ref="root" class="app-icon-picker">
		<UiButton
			ref="trigger"
			variant="secondary"
			size="sm"
			:title="tooltip"
			aria-haspopup="dialog"
			:aria-expanded="open ? 'true' : 'false'"
			:aria-controls="panelId"
			class="app-icon-picker__trigger"
			@click="toggle"
		>
			<template v-if="icon" #leading><UiIcon :name="icon" size="sm" /></template>
			{{ triggerLabel }}
		</UiButton>

		<div
			v-show="open"
			:id="panelId"
			ref="panel"
			class="app-icon-picker__panel"
			role="dialog"
			:aria-labelledby="`${uid}-title`"
			@keydown="onPanelKeydown"
		>
			<div class="app-icon-picker__header">
				<strong :id="`${uid}-title`">Choose an icon</strong>
				<UiButton v-if="icon && resetButtonShown" variant="danger" size="sm" @click="resetIcon">Remove</UiButton>
			</div>

			<div v-if="defaultIcons.length" class="app-icon-picker__grid" role="radiogroup" aria-label="Suggested icons">
				<label v-for="defaultIcon in defaultIcons" :key="defaultIcon" class="app-icon-picker__option" :title="defaultIcon">
					<input
						type="radio"
						class="app-icon-picker__radio"
						:name="radioName"
						:value="defaultIcon"
						:checked="selected === defaultIcon"
						@change="pick(defaultIcon)"
						@click="onOptionClick"
					>
					<span class="app-icon-picker__swatch"><UiIcon :name="defaultIcon" /></span>
					<span class="app-icon-picker__sr">{{ defaultIcon }}</span>
				</label>
			</div>

			<form class="app-icon-picker__custom" @submit.prevent="applyIcon">
				<UiField label="Add another icon" hint="Paste an &quot;Icon name&quot; from Google Fonts." class="app-icon-picker__field">
					<UiInput v-model="customIcon" size="sm" autocomplete="off" />
				</UiField>
				<UiButton type="submit" variant="primary" size="sm" :disabled="!customIcon">Apply</UiButton>
			</form>
			<a href="https://fonts.google.com/icons" target="_blank" rel="noopener noreferrer" class="app-icon-picker__link">
				Browse Google Fonts icons
			</a>
		</div>
	</div>
</template>

<style scoped>
.app-icon-picker {
	position: relative;
	display: inline-flex;
}

.app-icon-picker__panel {
	position: absolute;
	top: calc(100% + var(--space-1));
	inset-inline-start: 0;
	z-index: var(--z-dropdown);
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
	width: 18rem;
	padding: var(--space-4);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-control);
	background: var(--color-surface-raised);
	box-shadow: var(--shadow-card);
}

.app-icon-picker__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-2);
	min-height: var(--space-8);
	color: var(--color-ink);
}

.app-icon-picker__grid {
	display: grid;
	grid-template-columns: repeat(5, var(--space-10));
	justify-content: space-between;
	gap: var(--space-1);
}

.app-icon-picker__option {
	position: relative;
	cursor: pointer;
}

.app-icon-picker__swatch {
	display: grid;
	place-items: center;
	width: var(--space-10);
	height: var(--space-10);
	border-radius: var(--radius-pill);
	color: var(--color-ink-soft);
	transition: background var(--motion-fast);
}

.app-icon-picker__option:hover .app-icon-picker__swatch {
	background: var(--color-paper-2);
}

.app-icon-picker__radio:checked + .app-icon-picker__swatch {
	background: var(--color-paper-2);
	color: var(--color-accent-ink);
	box-shadow: inset 0 0 0 1px var(--color-accent);
}

.app-icon-picker__radio:focus-visible + .app-icon-picker__swatch {
	box-shadow: var(--ring-focus);
}

/* The radio stays in the accessibility tree and the tab order; only its box is hidden. */
.app-icon-picker__radio,
.app-icon-picker__sr {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
	opacity: 0;
}

.app-icon-picker__custom {
	display: flex;
	align-items: flex-start;
	gap: var(--space-2);
}

.app-icon-picker__field {
	flex: 1;
	min-width: 0;
}

/* Lines Apply up with the input rather than the label above it. */
.app-icon-picker__custom > :deep(.ui-button) {
	margin-top: calc(var(--text-sm) * 1.5 + var(--space-1));
}

.app-icon-picker__link {
	font-size: var(--text-xs);
	font-weight: var(--weight-semibold);
	color: var(--color-accent-ink);
	text-decoration: none;
}

.app-icon-picker__link:hover {
	text-decoration: underline;
}
</style>
