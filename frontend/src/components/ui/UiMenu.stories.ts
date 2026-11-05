import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiBadge from './UiBadge.vue';
import UiButton from './UiButton.vue';
import UiIcon from './UiIcon.vue';
import UiIconButton from './UiIconButton.vue';
import UiMenu from './UiMenu.vue';
import UiMenuItem from './UiMenuItem.vue';

/**
 * Dropdown menu, the `mat-menu` replacement (APG menu button). Spread the `trigger` slot's
 * `triggerProps` onto your own control. Try it from the keyboard: Enter/Space/ArrowDown open,
 * arrows/Home/End move, a letter jumps, Escape closes and returns focus, Tab closes.
 */
const meta = {
	title: 'UI/Menu',
	component: UiMenu,
	tags: ['autodocs'],
	parameters: { layout: 'centered' },
	args: { align: 'start', disabled: false },
	argTypes: { align: { control: 'inline-radio', options: ['start', 'end'] } },
} satisfies Meta<typeof UiMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The header account menu, item for item. */
export const AccountMenu: Story = {
	args: { align: 'end' },
	render: (args) => ({
		components: { UiMenu, UiMenuItem, UiIconButton, UiBadge, UiIcon },
		setup: () => ({ args }),
		template: `
      <UiMenu v-bind="args">
        <template #trigger="{ triggerProps }">
          <UiIconButton v-bind="triggerProps" icon="account_circle" label="user@example.com" :badge="1" badge-label="email not verified" />
        </template>
        <UiMenuItem to="/user-settings" description="user@example.com">
          <template #leading><UiBadge :content="1" label="Email not verified"><UiIcon name="face" size="sm" /></UiBadge></template>
          Account
        </UiMenuItem>
        <UiMenuItem to="/company" icon="apartment">Company</UiMenuItem>
        <UiMenuItem to="/secrets" icon="key">Secrets</UiMenuItem>
        <UiMenuItem to="/zapier" icon="electric_bolt">Zapier</UiMenuItem>
        <UiMenuItem href="https://docs.rocketadmin.com/" target="_blank" icon="help">Help center</UiMenuItem>
        <UiMenuItem icon="logout">Log out</UiMenuItem>
      </UiMenu>
    `,
	}),
};

/** A text trigger with a caret: the connection switcher. */
export const TextTrigger: Story = {
	render: (args) => ({
		components: { UiMenu, UiMenuItem, UiButton, UiIcon },
		setup: () => ({ args }),
		template: `
      <UiMenu v-bind="args">
        <template #trigger="{ triggerProps, open }">
          <UiButton v-bind="triggerProps" variant="ghost">
            Production DB
            <template #trailing><UiIcon :name="open ? 'arrow_drop_up' : 'arrow_drop_down'" size="sm" /></template>
          </UiButton>
        </template>
        <UiMenuItem to="/">Production DB</UiMenuItem>
        <UiMenuItem to="/">Staging DB</UiMenuItem>
        <UiMenuItem to="/">Analytics warehouse</UiMenuItem>
      </UiMenu>
    `,
	}),
};

/** Every item shape: link, external link, button, disabled, danger, with and without description. */
export const AllVariants: Story = {
	render: (args) => ({
		components: { UiMenu, UiMenuItem, UiIconButton },
		setup: () => ({ args }),
		template: `
      <div style="display: flex; gap: 2rem;">
        <UiMenu v-bind="args" :open="true" label="All item shapes">
          <template #trigger="{ triggerProps }">
            <UiIconButton v-bind="triggerProps" icon="more_vert" label="Row actions" />
          </template>
          <UiMenuItem to="/company" icon="apartment">Router link</UiMenuItem>
          <UiMenuItem href="https://docs.rocketadmin.com/" target="_blank" icon="open_in_new">External link</UiMenuItem>
          <UiMenuItem icon="edit" description="With a second line">Button</UiMenuItem>
          <UiMenuItem icon="archive" disabled>Disabled</UiMenuItem>
          <UiMenuItem icon="delete" variant="danger">Delete</UiMenuItem>
        </UiMenu>
        <UiMenu v-bind="args" disabled>
          <template #trigger="{ triggerProps }">
            <UiIconButton v-bind="triggerProps" icon="more_vert" label="Disabled menu" />
          </template>
          <UiMenuItem>Unreachable</UiMenuItem>
        </UiMenu>
      </div>
    `,
	}),
};
