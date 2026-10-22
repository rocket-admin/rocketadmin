import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiDivider from './UiDivider.vue';

/** `mat-divider`: a native `<hr>`. `vertical` stretches it to the height of a flex row. */
const meta = {
	title: 'UI/Divider',
	component: UiDivider,
	tags: ['autodocs'],
	args: { vertical: false },
} satisfies Meta<typeof UiDivider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Horizontal between blocks, vertical between toolbar items. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiDivider },
		template: `
      <div style="display: grid; gap: 1.5rem;">
        <div><p style="margin: 0 0 0.75rem;">Above</p><UiDivider /><p style="margin: 0.75rem 0 0;">Below</p></div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <span>Filter</span><UiDivider vertical /><span>Search</span><UiDivider vertical /><span>Export</span>
        </div>
      </div>
    `,
	}),
};
