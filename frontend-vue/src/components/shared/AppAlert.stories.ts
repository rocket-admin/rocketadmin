import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { type Alert, AlertActionType, AlertType } from '@/models/alert';
import AppAlert from './AppAlert.vue';

/**
 * The page alert (port of Angular's `app-alert`). Shows its `alert` prop, else the notifications
 * store's current alert. Three message shapes — plain string, abstract + details, and `null` (the
 * default slot) — and three action types.
 */
const meta = {
	title: 'App/Alert',
	component: AppAlert,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
} satisfies Meta<typeof AppAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

const dismiss = { type: AlertActionType.Button, caption: 'Dismiss', action: () => undefined };

export const Plain: Story = {
	args: {
		alert: { id: 1, type: AlertType.Error, message: 'Connection to the database timed out.', actions: [dismiss] },
	},
};

export const AbstractAndDetails: Story = {
	args: {
		alert: {
			id: 2,
			type: AlertType.Error,
			message: { abstract: 'Query failed', details: 'ERROR: relation "users" does not exist' },
			actions: [dismiss],
		},
	},
};

/** Every type, with each action shape, plus the slot form connect-db uses. */
export const AllVariants: Story = {
	render: () => ({
		components: { AppAlert },
		setup: () => {
			const alerts: Alert[] = [
				{
					id: 1,
					type: AlertType.Error,
					message: { abstract: 'Query failed', details: 'syntax error at "FROM"' },
					actions: [dismiss],
				},
				{
					id: 2,
					type: AlertType.Warning,
					message: 'This is a test connection. Changes are visible to everyone.',
					actions: [{ type: AlertActionType.Anchor, caption: 'Learn more', to: 'https://docs.rocketadmin.com/' }],
				},
				{
					id: 3,
					type: AlertType.Info,
					message: 'Some tables have no primary key, so their rows cannot be edited.',
					actions: [{ type: AlertActionType.Link, caption: 'Settings', to: '/company' }],
				},
				{ id: 4, type: AlertType.Success, message: 'Your email has been verified.' },
			];
			const slotAlert = { id: 5, type: AlertType.Warning, message: null } as unknown as Alert;
			return { alerts, slotAlert };
		},
		template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <AppAlert v-for="alert in alerts" :key="alert.id" :alert="alert" />
        <AppAlert :alert="slotAlert">
          Please make sure our servers are able to access your database. Rocketadmin uses the IP address
          <code>18.221.81.73</code> for all outbound requests.
        </AppAlert>
      </div>
    `,
	}),
};
