import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiCard from './UiCard.vue';
import UiPageShell from './UiPageShell.vue';

/**
 * The page wrapper, replacing 9 duplicated backgrounds and the 8 width boxes they always wrapped.
 * `layout: 'fullscreen'` here because the component *is* the page — padding it inside Storybook's
 * default frame would misrepresent it.
 *
 * The background toolbar is redundant for these stories: the shell paints `--color-paper` itself,
 * which is what silently fixes the two off-brand `#f5f6f8` pages.
 */
const meta = {
	title: 'UI/PageShell',
	component: UiPageShell,
	tags: ['autodocs'],
	parameters: { layout: 'fullscreen' },
	args: { align: 'top', width: 'panel' },
	argTypes: {
		align: { control: 'inline-radio', options: ['top', 'center'] },
		width: { control: 'inline-radio', options: ['panel', 'auth', 'full'] },
		as: { control: 'inline-radio', options: ['div', 'main', 'section'] },
	},
	render: (args) => ({
		components: { UiPageShell, UiCard },
		setup: () => ({ args }),
		template: `
      <UiPageShell v-bind="args" style="min-height: 26rem;">
        <h1 style="margin: 0 0 1.75rem; font-size: var(--text-2xl); line-height: var(--leading-tight);">
          Account
        </h1>
        <UiCard>Content column</UiCard>
      </UiPageShell>
    `,
	}),
} satisfies Meta<typeof UiPageShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** App pages: content starts at the top, in a 44rem column. */
export const AppPage: Story = {};

/** Auth pages: vertically centred, in a 26rem column. */
export const AuthPage: Story = {
	args: { align: 'center', width: 'auth' },
	render: (args) => ({
		components: { UiPageShell, UiCard },
		setup: () => ({ args }),
		template: `
      <UiPageShell v-bind="args" style="min-height: 26rem;">
        <UiCard shape="auth" padding="lg">
          <h1 style="margin: 0 0 0.5rem; font-size: var(--text-xl); line-height: var(--leading-tight);">
            Sign in
          </h1>
          <p style="margin: 0; color: var(--color-muted); font-size: var(--text-base);">
            Welcome back to SiteNova.
          </p>
        </UiCard>
      </UiPageShell>
    `,
	}),
};

/** `full` for a page that manages its own column — the split-pane views. */
export const FullWidth: Story = { args: { width: 'full' } };

/** Every alignment × width. The visible difference is where the column starts and how wide it is. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiPageShell, UiCard },
		setup: () => ({
			combos: [
				{ align: 'top' as const, width: 'panel' as const },
				{ align: 'top' as const, width: 'auth' as const },
				{ align: 'top' as const, width: 'full' as const },
				{ align: 'center' as const, width: 'panel' as const },
				{ align: 'center' as const, width: 'auth' as const },
				{ align: 'center' as const, width: 'full' as const },
			],
		}),
		template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <UiPageShell
          v-for="c in combos"
          :key="c.align + c.width"
          :align="c.align"
          :width="c.width"
          style="min-height: 9rem; border: 1px dashed var(--color-line);"
        >
          <UiCard>
            <span style="font-family: var(--font-mono); font-size: var(--text-2xs);">
              {{ c.align }} · {{ c.width }}
            </span>
          </UiCard>
        </UiPageShell>
      </div>
    `,
	}),
};
