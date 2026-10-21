import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { UiButton } from '@/components/ui';
import { AlertType } from '@/models/alert';
import AppBanner from './AppBanner.vue';

/** Full-height status card for page-level states (port of Angular's `app-banner`). */
const meta = {
	title: 'App/Banner',
	component: AppBanner,
	tags: ['autodocs'],
	parameters: { layout: 'fullscreen' },
	args: { type: AlertType.Error },
	argTypes: { type: { control: 'select', options: [undefined, ...Object.values(AlertType)] } },
	render: (args) => ({
		components: { AppBanner, UiButton },
		setup: () => ({ args }),
		template: `
      <AppBanner v-bind="args">
        <strong>Connection failed</strong>
        <p>ECONNREFUSED 10.0.0.12:5432</p>
        <template #actions>
          <UiButton variant="secondary" size="sm">Check database credentials</UiButton>
          <UiButton variant="danger" size="sm">Report a bug</UiButton>
        </template>
      </AppBanner>
    `,
	}),
} satisfies Meta<typeof AppBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ServerError: Story = {};

/** Each type, and none (the invalid-invitation page). */
export const AllVariants: Story = {
	render: () => ({
		components: { AppBanner },
		setup: () => ({ types: [...Object.values(AlertType), undefined] }),
		template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(30rem, 1fr));">
        <AppBanner v-for="type in types" :key="type ?? 'none'" :type="type" style="min-height: 14rem;">
          <h3 style="margin: 0 0 0.5rem;">{{ type ?? 'no type' }}</h3>
          <p>Rocketadmin can not find any tables.</p>
        </AppBanner>
      </div>
    `,
	}),
};
