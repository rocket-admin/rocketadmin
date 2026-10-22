import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApiKeyDeleteDialog from '@/components/user-settings/ApiKeyDeleteDialog.vue';
import { mountAuthView } from '@/views/auth/authTestUtils';
import ApiKeysView from './ApiKeysView.vue';

const user = vi.hoisted(() => ({ getAPIkeys: vi.fn(), generateAPIkey: vi.fn() }));
const open = vi.hoisted(() => vi.fn());
const trackAuthEvent = vi.hoisted(() => vi.fn());
const copyToClipboard = vi.hoisted(() => vi.fn());
const success = vi.hoisted(() => vi.fn());

vi.mock('@/stores/user', () => ({ useUserStore: () => user }));
vi.mock('@/stores/ui-settings', () => ({
	useUiSettingsStore: () => ({ getUiSettings: () => Promise.resolve(null), updateGlobalSetting: vi.fn() }),
}));
vi.mock('@/composables/useDialog', () => ({ useDialog: () => ({ open }) }));
vi.mock('@/composables/useNotify', () => ({ useNotify: () => ({ success }) }));
vi.mock('@/lib/clipboard', () => ({ copyToClipboard }));
vi.mock('@/components/auth/analytics', () => ({ trackAuthEvent }));

const keys = [
	{ id: 'key-1', title: 'CI' },
	{ id: 'key-2', title: 'Backups' },
];

const mountPage = () => mountAuthView(ApiKeysView, '/api-keys');

describe('ApiKeysView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		user.getAPIkeys.mockResolvedValue(keys);
		user.generateAPIkey.mockResolvedValue({ id: 'key-3', title: 'New', hash: 'secret-hash' });
		copyToClipboard.mockResolvedValue(true);
	});

	it('lists the API keys', async () => {
		const { wrapper } = await mountPage();
		expect(user.getAPIkeys).toHaveBeenCalled();
		expect(wrapper.findAll('.api-keys__item-title').map((title) => title.text())).toEqual(['CI', 'Backups']);
		wrapper.unmount();
	});

	it('shows the empty state', async () => {
		user.getAPIkeys.mockResolvedValue([]);
		const { wrapper } = await mountPage();
		expect(wrapper.text()).toContain("You don't have any API keys yet.");
		wrapper.unmount();
	});

	it('generates a key, shows its secret once and reloads the list', async () => {
		const { wrapper } = await mountPage();
		const generate = () => wrapper.find('[data-testid="generate-api-key-button"]');
		expect(generate().attributes('disabled')).toBeDefined();

		await wrapper.find('[data-testid="api-key-input"]').setValue('New');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(user.generateAPIkey).toHaveBeenCalledWith('New');
		expect(user.getAPIkeys).toHaveBeenCalledTimes(2);
		expect((wrapper.find('[data-testid="api-key-value-input"]').element as HTMLInputElement).value).toBe('secret-hash');
		expect((wrapper.find('[data-testid="api-key-input"]').element as HTMLInputElement).value).toBe('');
		expect(trackAuthEvent).toHaveBeenCalledWith('API Keys: key generated successfully');

		await wrapper.find('[data-testid="api-key-value-copy-button"]').trigger('click');
		await flushPromises();
		expect(copyToClipboard).toHaveBeenCalledWith('secret-hash');
		expect(success).toHaveBeenCalledWith('API key was copied to clipboard.');
		wrapper.unmount();
	});

	it('reloads the list after a key is deleted', async () => {
		open.mockReturnValue({ afterClosed: () => Promise.resolve('delete') });
		const { wrapper } = await mountPage();
		await wrapper.find('[data-testid="api-key-1-delete-button"]').trigger('click');
		await flushPromises();

		expect(open).toHaveBeenCalledWith(ApiKeyDeleteDialog, { data: keys[1] });
		expect(user.getAPIkeys).toHaveBeenCalledTimes(2);
		expect(trackAuthEvent).toHaveBeenCalledWith('API Keys: key deleted successfully');
		wrapper.unmount();
	});

	it('keeps the list when the delete dialog is cancelled', async () => {
		open.mockReturnValue({ afterClosed: () => Promise.resolve(undefined) });
		const { wrapper } = await mountPage();
		await wrapper.find('[data-testid="api-key-0-delete-button"]').trigger('click');
		await flushPromises();

		expect(user.getAPIkeys).toHaveBeenCalledTimes(1);
		wrapper.unmount();
	});
});
