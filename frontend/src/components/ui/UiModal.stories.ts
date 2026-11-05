import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import UiButton from './UiButton.vue';
import UiModal from './UiModal.vue';

/**
 * Modal dialog on the native `<dialog>` element.
 *
 * `showModal()` supplies focus trapping, `::backdrop`, top-layer stacking, Escape and `inert` on
 * the rest of the page — all from the browser. That is why `@headlessui/vue` was dropped in Phase 3:
 * its `Dialog` reimplements in JS what the platform now does natively, and a hand-rolled focus trap
 * is the most bug-prone code in any design system.
 *
 * Open the stories below and try Tab (focus stays inside), Escape, and a backdrop click.
 */
const meta = {
	title: 'UI/Modal',
	component: UiModal,
	tags: ['autodocs'],
	parameters: { layout: 'centered' },
	args: { open: false, title: 'Rename website', size: 'sm', dismissible: true },
	argTypes: {
		size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
		open: { control: 'boolean' },
	},
} satisfies Meta<typeof UiModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A trigger plus the dialog, which is how every real call site is shaped. */
export const Default: Story = {
	render: (args) => ({
		components: { UiModal, UiButton },
		setup: () => {
			const open = ref(false);
			return { args, open };
		},
		template: `
      <div>
        <UiButton @click="open = true">Open dialog</UiButton>
        <UiModal v-bind="args" v-model:open="open">
          Renaming changes the site's URL. Existing links keep working for 30 days.
          <template #footer>
            <UiButton variant="secondary" @click="open = false">Cancel</UiButton>
            <UiButton @click="open = false">Save</UiButton>
          </template>
        </UiModal>
      </div>
    `,
	}),
};

/** The wider size, for content that needs the room — a form rather than a sentence. */
export const Medium: Story = {
	args: { size: 'md', title: 'Website settings' },
	render: Default.render,
};

/**
 * `dismissible: false` removes the close button and refuses Escape and backdrop clicks, so the only
 * way out is an explicit choice in the footer. For destructive confirms and in-flight requests.
 */
export const NotDismissible: Story = {
	args: { dismissible: false, title: 'Deleting…' },
	render: (args) => ({
		components: { UiModal, UiButton },
		setup: () => {
			const open = ref(false);
			return { args, open };
		},
		template: `
      <div>
        <UiButton variant="danger" @click="open = true">Open (Escape will not close it)</UiButton>
        <UiModal v-bind="args" v-model:open="open">
          This dialog ignores Escape and backdrop clicks. Only the footer can dismiss it.
          <template #footer>
            <UiButton variant="secondary" @click="open = false">Let me out</UiButton>
          </template>
        </UiModal>
      </div>
    `,
	}),
};

/** Body-only: the footer slot is optional and collapses entirely when unused. */
export const WithoutFooter: Story = {
	args: { title: "What's new" },
	render: (args) => ({
		components: { UiModal, UiButton },
		setup: () => {
			const open = ref(false);
			return { args, open };
		},
		template: `
      <div>
        <UiButton variant="ghost" @click="open = true">Open</UiButton>
        <UiModal v-bind="args" v-model:open="open">
          Sites now rebuild in about half the time. Nothing you need to do.
        </UiModal>
      </div>
    `,
	}),
};

/** All sizes side by side, so a drifted radius, padding or shadow shows up immediately. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiModal, UiButton },
		setup: () => {
			const openSm = ref(false);
			const openMd = ref(false);
			const openLg = ref(false);
			return { openSm, openMd, openLg };
		},
		template: `
      <div style="display: flex; gap: 0.5rem;">
        <UiButton size="sm" @click="openSm = true">sm</UiButton>
        <UiButton size="sm" variant="secondary" @click="openMd = true">md</UiButton>
        <UiButton size="sm" variant="secondary" @click="openLg = true">lg</UiButton>

        <UiModal v-model:open="openSm" title="Small" size="sm">
          26rem — confirmations and short prompts.
          <template #footer><UiButton size="sm" @click="openSm = false">Close</UiButton></template>
        </UiModal>

        <UiModal v-model:open="openMd" title="Medium" size="md">
          36rem — forms and anything with more than a sentence of content.
          <template #footer><UiButton size="sm" @click="openMd = false">Close</UiButton></template>
        </UiModal>

        <UiModal v-model:open="openLg" title="Large" size="lg">
          52rem — wide dialogs: filters, row previews, tables.
          <template #footer><UiButton size="sm" @click="openLg = false">Close</UiButton></template>
        </UiModal>
      </div>
    `,
	}),
};
