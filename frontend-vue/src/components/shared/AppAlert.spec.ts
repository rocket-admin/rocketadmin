import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { type Alert, AlertActionType, AlertType } from '@/models/alert';
import { useNotificationsStore } from '@/stores/notifications';
import AppAlert from './AppAlert.vue';

function mountAlert(props: { alert?: Alert | null } = {}, slots: Record<string, string> = {}) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }],
	});
	return mount(AppAlert, { props, slots, global: { plugins: [router] } });
}

describe('AppAlert', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('renders nothing without an alert', () => {
		expect(mountAlert().find('.ui-alert').exists()).toBe(false);
	});

	it("renders the store's current alert, and disappears when it is dismissed", async () => {
		const wrapper = mountAlert();
		const notifications = useNotificationsStore();

		notifications.showAlert(AlertType.Error, 'Connection failed');
		await nextTick();
		expect(wrapper.get('[data-testid="alert-error-message"]').text()).toBe('Connection failed');
		expect(wrapper.get('.ui-alert').classes()).toContain('ui-alert--error');
		// Errors interrupt: UiAlert's assertive live region.
		expect(wrapper.get('.ui-alert').attributes('role')).toBe('alert');

		notifications.dismissAlert();
		await nextTick();
		expect(wrapper.find('.ui-alert').exists()).toBe(false);
	});

	it('prefers its own alert prop over the store', () => {
		useNotificationsStore().showAlert(AlertType.Error, 'From the store');
		const wrapper = mountAlert({ alert: { id: 7, type: AlertType.Warning, message: 'From the prop' } });

		expect(wrapper.text()).toContain('From the prop');
		expect(wrapper.text()).not.toContain('From the store');
		expect(wrapper.get('.ui-alert').classes()).toContain('ui-alert--warning');
	});

	it('renders abstract and details as a title over text', () => {
		const wrapper = mountAlert({
			alert: { id: 1, type: AlertType.Error, message: { abstract: 'Query failed', details: 'syntax error at "FROM"' } },
		});

		expect(wrapper.find('[data-testid="alert-error-message-box"]').exists()).toBe(true);
		expect(wrapper.get('[data-testid="alert-abstract"]').text()).toBe('Query failed');
		expect(wrapper.get('[data-testid="alert-details"]').text()).toBe('syntax error at "FROM"');
	});

	it('renders an abstract without details as a plain message', () => {
		const wrapper = mountAlert({
			alert: { id: 1, type: AlertType.Info, message: { abstract: 'Only the abstract', details: '' } },
		});

		expect(wrapper.get('[data-testid="alert-info-message"]').text()).toBe('Only the abstract');
		expect(wrapper.find('[data-testid="alert-details"]').exists()).toBe(false);
	});

	it('renders the default slot when the message is null', () => {
		const alert = { id: 1, type: AlertType.Warning, message: null } as unknown as Alert;
		const wrapper = mountAlert({ alert }, { default: '<span class="custom">Uses IP 18.221.81.73</span>' });

		expect(wrapper.find('.custom').exists()).toBe(true);
	});

	it('shows the icon for the alert type', () => {
		const wrapper = mountAlert({ alert: { id: 1, type: AlertType.Success, message: 'Saved' } });

		expect(wrapper.get('.ui-icon').text()).toBe('task_alt');
	});

	it('calls a button action with the alert id', async () => {
		// Ported from alert.component.spec.ts: "should call function from action on alert button click".
		const action = vi.fn();
		const wrapper = mountAlert({
			alert: {
				id: 42,
				type: AlertType.Error,
				message: 'Error message',
				actions: [{ type: AlertActionType.Button, caption: 'Dismiss', action }],
			},
		});

		await wrapper.get('[data-testid="alert-action-button"]').trigger('click');

		expect(action).toHaveBeenCalledWith(42);
	});

	it('renders internal links as router links and external links in a new tab', () => {
		const wrapper = mountAlert({
			alert: {
				id: 1,
				type: AlertType.Info,
				message: 'Upgrade to continue',
				actions: [
					{ type: AlertActionType.Link, caption: 'Upgrade', to: '/upgrade' },
					{ type: AlertActionType.Anchor, caption: 'Docs', to: 'https://docs.rocketadmin.com/' },
				],
			},
		});

		const internal = wrapper.get('[data-testid="alert-action-internal-link"]');
		expect(internal.attributes('href')).toBe('/upgrade');

		const external = wrapper.get('[data-testid="alert-action-external-link"]');
		expect(external.attributes('href')).toBe('https://docs.rocketadmin.com/');
		expect(external.attributes('target')).toBe('_blank');
		expect(external.attributes('rel')).toBe('noopener noreferrer');
	});

	it('wires a store alert Dismiss action back to the store', async () => {
		const wrapper = mountAlert();
		const notifications = useNotificationsStore();
		notifications.showAlert(AlertType.Error, 'Failed', [
			{ type: AlertActionType.Button, caption: 'Dismiss', action: () => notifications.dismissAlert() },
		]);
		await nextTick();

		await wrapper.get('[data-testid="alert-action-button"]').trigger('click');

		expect(notifications.alert).toBeNull();
	});
});
