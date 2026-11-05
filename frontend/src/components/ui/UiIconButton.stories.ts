import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiIconButton from './UiIconButton.vue';

/**
 * Icon-only button, the `mat-icon-button` replacement. `label` is required: it is the accessible
 * name and the `title` tooltip. Same `to`/`href` polymorphism as UiButton.
 */
const meta = {
	title: 'UI/IconButton',
	component: UiIconButton,
	tags: ['autodocs'],
	args: { icon: 'menu', label: 'Open navigation', variant: 'ghost', size: 'md', disabled: false, badge: false },
	argTypes: {
		variant: { control: 'select', options: ['ghost', 'secondary', 'primary', 'danger'] },
		size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
		to: { control: false },
		href: { control: false },
	},
} satisfies Meta<typeof UiIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The header account button while the email is unverified. */
export const WithBadge: Story = {
	args: { icon: 'account_circle', label: 'Account', badge: 1, badgeLabel: 'email not verified' },
};

export const AsLink: Story = {
	args: { icon: 'help', label: 'Help center', href: 'https://docs.rocketadmin.com/', target: '_blank' },
};

/** Every variant × size, plus disabled and badged. */
export const AllVariants: Story = {
	parameters: { layout: 'padded' },
	render: () => ({
		components: { UiIconButton },
		setup: () => ({
			variants: ['ghost', 'secondary', 'primary', 'danger'] as const,
			sizes: ['sm', 'md', 'lg'] as const,
		}),
		template: `
      <table style="border-collapse: collapse;">
        <tbody>
          <tr v-for="variant in variants" :key="variant">
            <th scope="row" style="text-align: left; padding: 0.5rem 1rem 0.5rem 0; font-size: 0.8125rem;">{{ variant }}</th>
            <td v-for="size in sizes" :key="size" style="padding: 0.5rem 1rem;">
              <UiIconButton :variant="variant" :size="size" icon="delete" :label="'Delete ' + size" />
            </td>
            <td style="padding: 0.5rem 1rem;">
              <UiIconButton :variant="variant" icon="delete" label="Delete (disabled)" disabled />
            </td>
            <td style="padding: 0.5rem 1rem;">
              <UiIconButton :variant="variant" icon="notifications" label="Notifications" :badge="3" />
            </td>
            <td style="padding: 0.5rem 1rem;">
              <UiIconButton :variant="variant" icon="account_circle" label="Account" badge />
            </td>
          </tr>
        </tbody>
      </table>
    `,
	}),
};
