import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, reactive } from 'vue';
import CreateSecretDialog from '@/components/secrets/CreateSecretDialog.vue';
import DeleteSecretDialog from '@/components/secrets/DeleteSecretDialog.vue';
import EditSecretDialog from '@/components/secrets/EditSecretDialog.vue';
import SecretAuditLogDialog from '@/components/secrets/SecretAuditLogDialog.vue';
import { useDialogsStore } from '@/composables/useDialog';
import type { Secret, SecretListResponse, SecretPagination } from '@/models/secret';
import SecretsView from './SecretsView.vue';

const store = vi.hoisted(() => ({
	secrets: [] as Secret[],
	pagination: null as SecretPagination | null,
	loading: false,
	fetchSecrets: vi.fn(),
}));
const trackEvent = vi.hoisted(() => vi.fn());
vi.mock('@/stores/secrets', () => ({ useSecretsStore: () => storeState }));
vi.mock('@/composables/useAnalytics', () => ({ trackEvent }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

const storeState = reactive(store);

const secret: Secret = {
	id: '1',
	slug: 'test-secret',
	companyId: '1',
	createdAt: '2024-01-01',
	updatedAt: '2024-01-01T10:00:00Z',
	masterEncryption: false,
};

function respond(data: Secret[], pagination: Partial<SecretPagination> = {}): SecretListResponse {
	return { data, pagination: { total: data.length, currentPage: 1, perPage: 20, lastPage: 1, ...pagination } };
}

/** Makes fetchSecrets behave like the store: it sets the page on screen and returns it. */
function serve(response: SecretListResponse) {
	storeState.fetchSecrets.mockImplementation(() => {
		storeState.secrets = response.data;
		storeState.pagination = response.pagination;
		return Promise.resolve(response);
	});
}

const ProfileLayoutStub = defineComponent({
	props: { activeTab: { type: String, required: true } },
	setup:
		(props, { slots }) =>
		() =>
			h('div', { 'data-testid': 'profile-layout', 'data-tab': props.activeTab }, slots.default?.()),
});

let wrapper: VueWrapper;

async function mountPage() {
	setActivePinia(createPinia());
	wrapper = mount(SecretsView, {
		attachTo: document.body,
		global: { stubs: { ProfileLayout: ProfileLayoutStub } },
	});
	await flushPromises();
}

const byTestId = (id: string) => wrapper.find(`[data-testid="${id}"]`);
const lastDialog = () => useDialogsStore().entries.at(-1);

describe('SecretsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		storeState.secrets = [];
		storeState.pagination = null;
		storeState.loading = false;
		serve(respond([secret]));
	});

	afterEach(() => {
		wrapper.unmount();
		vi.useRealTimers();
	});

	it('renders in the profile layout with the secrets tab active', async () => {
		await mountPage();
		expect(byTestId('profile-layout').attributes('data-tab')).toBe('secrets');
		expect(wrapper.find('h1').text()).toBe('Company Secrets');
	});

	it('loads the first page of 20 secrets without a search', async () => {
		await mountPage();
		expect(storeState.fetchSecrets).toHaveBeenCalledWith(1, 20, undefined);
		expect(byTestId('secret-slug-0-cell').text()).toBe('test-secret');
		expect(byTestId('secrets-paginator').exists()).toBe(true);
	});

	it('shows the skeleton until the first page arrives', async () => {
		storeState.fetchSecrets.mockReturnValue(new Promise(() => {}));
		await mountPage();
		expect(wrapper.find('[role="status"][aria-label="Loading secrets"]').exists()).toBe(true);
		expect(wrapper.find('table').exists()).toBe(false);
	});

	it('shows the skeleton while the store reloads after a change', async () => {
		await mountPage();
		storeState.loading = true;
		await flushPromises();
		expect(wrapper.find('[aria-label="Loading secrets"]').exists()).toBe(true);
	});

	it('shows the empty state with a create button when there are no secrets', async () => {
		serve(respond([]));
		await mountPage();
		expect(byTestId('secrets-empty').text()).toContain('No secrets found');
		expect(byTestId('secrets-empty').text()).toContain('Create your first secret to securely store sensitive data.');
		expect(wrapper.find('table').exists()).toBe(false);
		expect(byTestId('secrets-paginator').exists()).toBe(false);

		await byTestId('secrets-empty-create-button').trigger('click');
		expect(lastDialog()?.component).toBe(CreateSecretDialog);
	});

	describe('cells', () => {
		it('shows the encryption kind', async () => {
			serve(respond([secret, { ...secret, id: '2', slug: 'locked', masterEncryption: true }]));
			await mountPage();
			expect(byTestId('secret-encryption-0-cell').find('[aria-label="Standard encryption"]').exists()).toBe(true);
			expect(byTestId('secret-encryption-1-cell').find('[aria-label="Protected with master password"]').exists()).toBe(
				true,
			);
		});

		it('shows Never, Expired, an expiring-soon warning or the date', async () => {
			const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
			serve(
				respond([
					secret,
					{ ...secret, id: '2', expiresAt: '2024-01-01T00:00:00Z' },
					{ ...secret, id: '3', expiresAt: soon },
					{ ...secret, id: '4', expiresAt: '2099-03-04T12:00:00Z' },
				]),
			);
			await mountPage();
			expect(byTestId('secret-expires-0-cell').text()).toBe('Never');
			expect(byTestId('secret-expires-1-cell').text()).toContain('Expired');
			expect(byTestId('secret-expires-2-cell').find('.secrets__badge--expiring').exists()).toBe(true);
			expect(byTestId('secret-expires-3-cell').text()).toBe('Mar 4, 2099');
		});

		it('shows the last update as a medium date-time', async () => {
			await mountPage();
			expect(byTestId('secret-updated-0-cell').text()).toMatch(/^Jan 1, 2024, \d{1,2}:00:00 (AM|PM)$/);
		});
	});

	describe('dialogs', () => {
		it('opens the create dialog and tracks it', async () => {
			await mountPage();
			await byTestId('create-secret-button').trigger('click');
			expect(lastDialog()?.component).toBe(CreateSecretDialog);
			expect(trackEvent).toHaveBeenCalledWith('Secrets: create secret dialog opened');
		});

		it('opens the edit dialog with the secret', async () => {
			await mountPage();
			await byTestId('secret-edit-0-menu-item').trigger('click');
			expect(lastDialog()?.component).toBe(EditSecretDialog);
			expect(lastDialog()?.data).toEqual({ secret });
			expect(trackEvent).toHaveBeenCalledWith('Secrets: edit secret dialog opened');
		});

		it('does not offer editing an expired secret', async () => {
			serve(respond([{ ...secret, expiresAt: '2024-01-01T00:00:00Z' }]));
			await mountPage();
			expect(byTestId('secret-edit-0-menu-item').attributes('aria-disabled')).toBe('true');
			await byTestId('secret-edit-0-menu-item').trigger('click');
			expect(useDialogsStore().entries).toHaveLength(0);
		});

		it('opens the audit log dialog with the secret', async () => {
			await mountPage();
			await byTestId('secret-audit-0-menu-item').trigger('click');
			expect(lastDialog()?.component).toBe(SecretAuditLogDialog);
			expect(lastDialog()?.data).toEqual({ secret });
			expect(trackEvent).toHaveBeenCalledWith('Secrets: audit log dialog opened');
		});

		it('opens the delete dialog with the secret', async () => {
			await mountPage();
			await byTestId('secret-delete-0-menu-item').trigger('click');
			expect(lastDialog()?.component).toBe(DeleteSecretDialog);
			expect(lastDialog()?.data).toEqual({ secret });
			expect(trackEvent).toHaveBeenCalledWith('Secrets: delete secret dialog opened');
		});
	});

	describe('paging', () => {
		it('loads the page the paginator asks for', async () => {
			serve(respond([secret], { total: 100, lastPage: 5 }));
			await mountPage();
			storeState.fetchSecrets.mockClear();

			await wrapper.find('button[aria-label="Next page"]').trigger('click');
			await flushPromises();

			expect(storeState.fetchSecrets).toHaveBeenCalledWith(2, 20, undefined);
		});
	});

	describe('search', () => {
		it('searches 300ms after typing stops, from page 1', async () => {
			vi.useFakeTimers();
			serve(respond([secret], { total: 100, lastPage: 5 }));
			await mountPage();
			await wrapper.find('button[aria-label="Next page"]').trigger('click');
			await flushPromises();
			storeState.fetchSecrets.mockClear();

			await byTestId('secrets-search-input').setValue('api');
			await byTestId('secrets-search-input').setValue('api-key');
			vi.advanceTimersByTime(299);
			expect(storeState.fetchSecrets).not.toHaveBeenCalled();

			vi.advanceTimersByTime(1);
			await flushPromises();
			expect(storeState.fetchSecrets).toHaveBeenCalledTimes(1);
			expect(storeState.fetchSecrets).toHaveBeenCalledWith(1, 20, 'api-key');
		});

		it('does not search again for the same query', async () => {
			vi.useFakeTimers();
			await mountPage();
			await byTestId('secrets-search-input').setValue('api-key');
			vi.advanceTimersByTime(300);
			await flushPromises();
			storeState.fetchSecrets.mockClear();

			await byTestId('secrets-search-input').setValue('api-ke');
			await byTestId('secrets-search-input').setValue('api-key');
			vi.advanceTimersByTime(300);
			await flushPromises();
			expect(storeState.fetchSecrets).not.toHaveBeenCalled();
		});

		it('says nothing matched a search', async () => {
			vi.useFakeTimers();
			await mountPage();
			serve(respond([]));
			await byTestId('secrets-search-input').setValue('nothing');
			vi.advanceTimersByTime(300);
			await flushPromises();

			expect(byTestId('secrets-empty').text()).toContain('No secrets match your search criteria.');
			expect(byTestId('secrets-empty-create-button').exists()).toBe(false);
		});
	});
});
