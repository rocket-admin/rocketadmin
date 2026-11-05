import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import UiDrawer from './UiDrawer.vue';
import UiIconButton from './UiIconButton.vue';

/**
 * Side drawer on the native `<dialog>`, the `mat-sidenav mode="over"` replacement. Escape, the
 * backdrop and the `v-model:open` binding close it; focus moves in on open and back to the menu
 * button on close. Toggle the OS "reduce motion" setting to check the slide is suppressed.
 */
const meta = {
	title: 'UI/Drawer',
	component: UiDrawer,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: { open: false, label: 'Main navigation', size: 'md' },
	argTypes: { size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] } },
	render: (args) => ({
		components: { UiDrawer, UiIconButton },
		setup: () => ({ args, open: ref(false) }),
		template: `
      <div>
        <UiIconButton icon="menu" label="Open navigation" @click="open = true" />
        <UiDrawer v-bind="args" v-model:open="open">
          <template #header><strong>Rocketadmin</strong></template>
          <nav aria-label="Primary" style="display: flex; flex-direction: column;">
            <a href="#connections" style="padding: 0.75rem 1rem;">Connections</a>
            <a href="#company" style="padding: 0.75rem 1rem;">Company</a>
            <a href="#secrets" style="padding: 0.75rem 1rem;">Secrets</a>
          </nav>
          <template #footer>v1.0.0</template>
        </UiDrawer>
      </div>
    `,
	}),
} satisfies Meta<typeof UiDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** All three widths side by side (each opens its own drawer). */
export const AllVariants: Story = {
	render: () => ({
		components: { UiDrawer, UiIconButton },
		setup: () => ({ sizes: ['sm', 'md', 'lg'] as const, open: ref<string | null>(null) }),
		template: `
      <div style="display: flex; gap: 1rem;">
        <div v-for="size in sizes" :key="size" style="display: flex; align-items: center; gap: 0.5rem;">
          <UiIconButton icon="menu" :label="'Open ' + size + ' drawer'" variant="secondary" @click="open = size" />
          <code style="font-size: 0.75rem; color: var(--color-muted);">{{ size }}</code>
          <UiDrawer :open="open === size" :size="size" :label="size + ' drawer'" @update:open="open = null">
            <template #header><strong>{{ size }} drawer</strong></template>
            <p style="padding: 0 1rem;">Drawer content.</p>
          </UiDrawer>
        </div>
      </div>
    `,
	}),
};
