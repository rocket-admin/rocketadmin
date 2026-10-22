<script setup lang="ts">
// The "Access" cell of the company members table: a check when the member belongs to any group,
// with a hover/focus popup listing each connection and its groups (Angular's cdkConnectedOverlay);
// a cross otherwise.
//
// The popup is a `popover="manual"` element so it escapes the table's scroll container, placed
// above the icon (below when there is no room), like UiMenu's panel.
import { nextTick, ref, useId } from 'vue';
import { UiIcon } from '@/components/ui';
import type { CompanyMember } from '@/models/company';

const props = defineProps<{
	member: Pick<CompanyMember, 'has_groups' | 'user_membership'>;
}>();

/** Gap between icon and popup, in px — `--space-1`. Measured geometry, so it can't read the token. */
const OFFSET = 4;

const popupId = `${useId()}-access`;
const open = ref(false);
const trigger = ref<HTMLElement | null>(null);
const popup = ref<HTMLElement | null>(null);
const coords = ref<{ top: string; left: string } | undefined>(undefined);

async function show() {
	if (!props.member.user_membership?.length) return;
	open.value = true;
	await nextTick();
	const el = popup.value;
	if (!el) return;
	callPopover(el, 'showPopover');
	place();
}

function hide() {
	open.value = false;
	if (popup.value) callPopover(popup.value, 'hidePopover');
}

function place() {
	const anchor = trigger.value;
	const el = popup.value;
	if (!anchor || !el) return;
	const rect = anchor.getBoundingClientRect();
	const { offsetWidth: width, offsetHeight: height } = el;
	let top = rect.top - OFFSET - height;
	if (top < 0) top = rect.bottom + OFFSET;
	const left = Math.max(OFFSET, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - OFFSET));
	coords.value = { top: `${top}px`, left: `${left}px` };
}

/** The popover API is missing in jsdom and older browsers; `v-show` still hides the popup there. */
function callPopover(el: HTMLElement, method: 'showPopover' | 'hidePopover') {
	const fn = (el as Partial<Pick<HTMLElement, 'showPopover' | 'hidePopover'>>)[method];
	try {
		fn?.call(el);
	} catch {
		// Already in the requested state.
	}
}
</script>

<template>
	<span v-if="member.has_groups" class="company-member-access">
		<span
			ref="trigger"
			class="company-member-access__icon company-member-access__icon--yes"
			tabindex="0"
			role="img"
			aria-label="Has access"
			:aria-describedby="popupId"
			@mouseenter="show"
			@mouseleave="hide"
			@focus="show"
			@blur="hide"
			@keydown.esc="hide"
		>
			<UiIcon name="check_circle" />
		</span>
		<div
			v-show="open"
			:id="popupId"
			ref="popup"
			role="tooltip"
			popover="manual"
			class="company-member-access__popup"
			:style="coords"
		>
			<div v-for="conn in member.user_membership" :key="conn.id" class="company-member-access__connection">
				<span class="company-member-access__connection-title">{{ conn.title }}</span>
				<span class="company-member-access__connection-db">{{ conn.database }}</span>
				<span v-for="group in conn.groups" :key="group.id" class="company-member-access__group">{{ group.title }}</span>
			</div>
		</div>
	</span>
	<UiIcon v-else name="cancel" label="No access" class="company-member-access__icon company-member-access__icon--no" />
</template>

<style scoped>
.company-member-access {
	display: inline-flex;
}

.company-member-access__icon {
	display: inline-flex;
	border-radius: var(--radius-pill);
}

.company-member-access__icon:focus-visible {
	outline: none;
	box-shadow: var(--ring-focus);
}

.company-member-access__icon--yes {
	color: var(--color-success);
}

.company-member-access__icon--no {
	color: var(--color-danger);
}

/* Overrides the UA `[popover]` box (centred, inset: 0, a border and Canvas background). */
.company-member-access__popup {
	position: fixed;
	inset: auto;
	z-index: var(--z-tooltip);
	display: flex;
	flex-direction: column;
	gap: var(--space-1);
	min-width: 160px;
	margin: 0;
	padding: var(--space-2) var(--space-3);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-control);
	background: var(--color-surface-raised);
	box-shadow: var(--shadow-lift);
	color: var(--color-ink);
	font-size: var(--text-sm);
	white-space: nowrap;
	text-align: start;
}

.company-member-access__connection {
	display: flex;
	flex-direction: column;
}

.company-member-access__connection-title {
	font-weight: var(--weight-medium);
}

.company-member-access__connection-db {
	padding-inline-start: var(--space-05);
	font-size: var(--text-2xs);
	color: var(--color-muted);
}

.company-member-access__group {
	padding-inline-start: var(--space-2);
	font-size: var(--text-xs);
	color: var(--color-ink-soft);
}
</style>
