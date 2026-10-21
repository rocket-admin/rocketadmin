import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import UiButton from './UiButton.vue';
import UiConfirmDialog from './UiConfirmDialog.vue';

/**
 * Confirmation prompt for destructive actions, replacing `window.confirm()` at
 * `WebsitesView.vue:37`.
 *
 * `window.confirm` blocks the main thread, cannot be branded, has no room for consequence text and
 * offers no "working…" state — so a slow delete looks frozen. It is also suppressible per-origin in
 * most browsers, which quietly turns a guarded action into an unguarded one.
 *
 * `tone` is mapped to `UiButton`'s `variant` internally: a component never carries both, per
 * _Foundations → Conventions_.
 */
const meta = {
	title: 'UI/ConfirmDialog',
	component: UiConfirmDialog,
	tags: ['autodocs'],
	parameters: { layout: 'centered' },
	args: {
		open: false,
		title: 'Delete "portfolio-site"?',
		message: "This deletes the site and every version of it. This can't be undone.",
		confirmLabel: 'Delete',
		cancelLabel: 'Cancel',
		tone: 'danger',
		busy: false,
	},
	argTypes: { tone: { control: 'inline-radio', options: ['danger', 'accent'] } },
} satisfies Meta<typeof UiConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The WebsitesView delete flow, which is the call site this replaces. */
export const Default: Story = {
	render: (args) => ({
		components: { UiConfirmDialog, UiButton },
		setup: () => {
			const open = ref(false);
			return { args, open };
		},
		template: `
      <div>
        <UiButton variant="danger" @click="open = true">Delete website</UiButton>
        <UiConfirmDialog
          v-bind="args"
          v-model:open="open"
          @confirm="open = false"
        />
      </div>
    `,
	}),
};

/** Non-destructive confirmations use `accent`, which maps to the primary button. */
export const Accent: Story = {
	args: {
		tone: 'accent',
		title: 'Publish this version?',
		message: 'Your site will be live at the public URL within a minute.',
		confirmLabel: 'Publish',
	},
	render: Default.render,
};

/**
 * `busy` is the state `window.confirm` cannot express: the request is in flight, so the confirm
 * button spins and Escape, the backdrop and Cancel are all locked until it resolves.
 */
export const Busy: Story = {
	args: { open: true, busy: true },
	render: (args) => ({
		components: { UiConfirmDialog },
		setup: () => ({ args }),
		template: '<UiConfirmDialog v-bind="args" />',
	}),
};

/**
 * The default slot carries options that qualify the action itself. This is the WebsitesView case:
 * deleting a website leaves its database running, and the checkbox is how the user opts into
 * dropping that too — unticked by default, because it destroys data the plain delete keeps.
 */
export const WithOption: Story = {
	args: {
		open: true,
		message:
			"This deletes the site and every version of it. This can't be undone. Its database is kept unless you choose otherwise below.",
	},
	render: (args) => ({
		components: { UiConfirmDialog },
		setup: () => {
			const alsoDeleteDatabase = ref(false);
			return { args, alsoDeleteDatabase };
		},
		// The whole label is the hit target, so the consequence line is clickable rather than a
		// caption the pointer falls off.
		template: `
      <UiConfirmDialog v-bind="args">
        <label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer;">
          <input v-model="alsoDeleteDatabase" type="checkbox" style="margin-top: 0.15rem;" />
          <span>
            Also delete the database for this website
            <span style="display: block; margin-top: 0.25rem; font-size: 0.75rem; color: var(--color-danger);">
              Permanently deletes the database and all data in it. This can't be undone.
            </span>
          </span>
        </label>
      </UiConfirmDialog>
    `,
	}),
};

/** Both tones, resting and busy — the matrix that catches a drifted confirm button. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiConfirmDialog, UiButton },
		setup: () => {
			const which = ref<string | null>(null);
			return { which };
		},
		template: `
      <div style="display: flex; gap: 0.5rem;">
        <UiButton size="sm" variant="danger" @click="which = 'danger'">danger</UiButton>
        <UiButton size="sm" @click="which = 'accent'">accent</UiButton>
        <UiButton size="sm" variant="secondary" @click="which = 'busy'">busy</UiButton>

        <UiConfirmDialog
          :open="which === 'danger'"
          title="Delete &quot;portfolio-site&quot;?"
          message="This deletes the site and every version of it."
          confirm-label="Delete"
          tone="danger"
          @update:open="which = null"
          @confirm="which = null"
        />
        <UiConfirmDialog
          :open="which === 'accent'"
          title="Publish this version?"
          message="Your site will be live within a minute."
          confirm-label="Publish"
          tone="accent"
          @update:open="which = null"
          @confirm="which = null"
        />
        <UiConfirmDialog
          :open="which === 'busy'"
          title="Deleting…"
          message="Locked until the request resolves — Escape and the backdrop do nothing."
          confirm-label="Delete"
          busy
          @update:open="which = null"
        />
      </div>
    `,
	}),
};
