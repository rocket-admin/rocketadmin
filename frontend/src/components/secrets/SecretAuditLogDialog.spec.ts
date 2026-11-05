import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditLogEntry, AuditLogResponse } from '@/models/secret';
import SecretAuditLogDialog from './SecretAuditLogDialog.vue';
import { buttonByText, mockSecret, openDialog } from './secretsTestUtils';

const store = vi.hoisted(() => ({ getAuditLog: vi.fn() }));
vi.mock('@/stores/secrets', () => ({ useSecretsStore: () => store }));

const entry: AuditLogEntry = {
	id: '1',
	action: 'create',
	user: { id: '1', email: 'user@example.com' },
	accessedAt: '2024-01-01T00:00:00Z',
	success: true,
};

const oneEntry = (): AuditLogResponse => ({
	data: [entry],
	pagination: { total: 1, currentPage: 1, perPage: 20, lastPage: 1 },
});

const allActions = (): AuditLogResponse => ({
	data: [
		entry,
		{
			id: '2',
			action: 'view',
			user: { id: '2', email: 'viewer@example.com' },
			accessedAt: '2024-01-02T00:00:00Z',
			success: true,
		},
		{
			id: '3',
			action: 'update',
			user: { id: '1', email: 'user@example.com' },
			accessedAt: '2024-01-03T00:00:00Z',
			success: true,
		},
		{
			id: '4',
			action: 'copy',
			user: { id: '3', email: 'copier@example.com' },
			accessedAt: '2024-01-04T00:00:00Z',
			success: true,
		},
		{
			id: '5',
			action: 'delete',
			user: { id: '1', email: 'user@example.com' },
			accessedAt: '2024-01-05T00:00:00Z',
			success: false,
			errorMessage: 'Deletion failed',
		},
	],
	pagination: { total: 100, currentPage: 1, perPage: 20, lastPage: 5 },
});

let wrapper: VueWrapper;

async function mountDialog() {
	const opened = await openDialog<void>(SecretAuditLogDialog, { secret: mockSecret });
	wrapper = opened.wrapper;
	return opened.dialogRef;
}

const bodyRows = () => wrapper.findAll('tbody tr');

describe('SecretAuditLogDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.getAuditLog.mockResolvedValue(oneEntry());
	});

	afterEach(() => wrapper.unmount());

	it('loads the first page of 20 entries for the secret', async () => {
		await mountDialog();
		expect(wrapper.find('h2').text()).toBe('Audit Log: test-secret');
		expect(store.getAuditLog).toHaveBeenCalledWith('test-secret', 1, 20);
		expect(bodyRows()).toHaveLength(1);
		expect(wrapper.text()).toContain('user@example.com');
	});

	it('shows a loader while the log loads', async () => {
		store.getAuditLog.mockReturnValue(new Promise(() => {}));
		await mountDialog();
		expect(wrapper.text()).toContain('Loading audit log...');
		expect(wrapper.find('table').exists()).toBe(false);
	});

	it('shows the empty state when nothing was recorded', async () => {
		store.getAuditLog.mockResolvedValue({
			data: [],
			pagination: { total: 0, currentPage: 1, perPage: 20, lastPage: 1 },
		});
		await mountDialog();
		expect(wrapper.text()).toContain('No audit log entries');
		expect(wrapper.text()).toContain('No actions have been recorded for this secret yet.');
		expect(wrapper.find('table').exists()).toBe(false);
	});

	it('labels every action with its icon', async () => {
		store.getAuditLog.mockResolvedValue(allActions());
		await mountDialog();
		const actions = bodyRows().map((row) => row.find('.audit-log__action'));
		expect(actions.map((cell) => cell.find('span:last-child').text())).toEqual([
			'Created',
			'Viewed',
			'Updated',
			'Copied',
			'Deleted',
		]);
		expect(actions.map((cell) => cell.find('.ui-icon').text())).toEqual([
			'add_circle',
			'visibility',
			'edit',
			'content_copy',
			'delete',
		]);
	});

	it('marks failed entries with their error message', async () => {
		store.getAuditLog.mockResolvedValue(allActions());
		await mountDialog();
		const failed = bodyRows()[4];
		expect(failed?.classes()).toContain('audit-log__row--failed');
		expect(failed?.find('[aria-label="Deletion failed"]').exists()).toBe(true);
		expect(bodyRows()[0]?.classes()).not.toContain('audit-log__row--failed');
		expect(bodyRows()[0]?.find('[aria-label="Success"]').exists()).toBe(true);
	});

	it('loads the page the paginator asks for', async () => {
		store.getAuditLog.mockResolvedValue(allActions());
		await mountDialog();
		store.getAuditLog.mockClear();

		await wrapper.find('button[aria-label="Next page"]').trigger('click');
		await flushPromises();

		expect(store.getAuditLog).toHaveBeenCalledWith('test-secret', 2, 20);
	});

	it('closes on Close', async () => {
		const dialogRef = await mountDialog();
		await buttonByText(wrapper, 'Close').trigger('click');
		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
	});
});
