// Ports the behaviour covered by frontend/src/app/services/table-row.service.spec.ts.
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeError, jsonResponse, mockFetch } from '@/__tests__/mock-fetch';
import { tableEvents } from '@/lib/table-events';
import { AlertType } from '@/models/alert';
import { useNotificationsStore } from '@/stores/notifications';
import { useTableRowStore } from './table-row';

vi.mock('@/environment', () => ({ environment: { apiRoot: '', saasURL: '' } }));
vi.mock('@/config', () => ({ getConfig: () => ({ baseURL: '/api', saasURL: '' }) }));

const row = { id: 11, first_name: 'Yuriy', last_name: 'Datsyuk' };

describe('table row store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		tableEvents.all.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('fetchTableRow sends the primary key and table name', async () => {
		const fetch = mockFetch(jsonResponse({ row }));
		expect(await useTableRowStore().fetchTableRow('12345678', 'users_table', { id: 11 })).toEqual({ row });
		expect(fetch.last().url).toBe('/api/table/row/12345678?id=11&tableName=users_table');
	});

	it('fetchTableRow shows an error snackbar on failure', async () => {
		mockFetch(jsonResponse(fakeError, 400));
		const showErrorSnackbar = vi.spyOn(useNotificationsStore(), 'showErrorSnackbar');
		await expect(useTableRowStore().fetchTableRow('1', 't', { id: 1 })).rejects.toThrow();
		expect(showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
	});

	it('addTableRow posts the row and confirms', async () => {
		const fetch = mockFetch(jsonResponse({ row }));
		const showSuccessSnackbar = vi.spyOn(useNotificationsStore(), 'showSuccessSnackbar');
		await useTableRowStore().addTableRow('12345678', 'users_table', row);
		expect(fetch.last().method).toBe('POST');
		expect(fetch.last().url).toBe('/api/table/row/12345678?tableName=users_table');
		expect(fetch.last().json).toEqual(row);
		expect(showSuccessSnackbar).toHaveBeenCalledWith('The row has been added successfully to "users_table" table.');
	});

	it.each([
		['addTableRow', () => useTableRowStore().addTableRow('1', 't', row)],
		['updateTableRow', () => useTableRowStore().updateTableRow('1', 't', { id: 11 }, row)],
	])('%s shows an error alert on failure', async (_name, call) => {
		mockFetch(jsonResponse(fakeError, 400));
		const showAlert = vi.spyOn(useNotificationsStore(), 'showAlert');
		await expect(call()).rejects.toThrow();
		expect(showAlert).toHaveBeenCalledWith(
			AlertType.Error,
			{ abstract: fakeError.message, details: fakeError.originalMessage },
			[expect.objectContaining({ caption: 'Dismiss' })],
		);
	});

	it('updateTableRow puts the row under its primary key and confirms', async () => {
		const fetch = mockFetch(jsonResponse({ row }));
		const showSuccessSnackbar = vi.spyOn(useNotificationsStore(), 'showSuccessSnackbar');
		await useTableRowStore().updateTableRow('12345678', 'users_table', { id: 11 }, row);
		expect(fetch.last().method).toBe('PUT');
		expect(fetch.last().url).toBe('/api/table/row/12345678?id=11&tableName=users_table');
		expect(showSuccessSnackbar).toHaveBeenCalledWith('The row has been updated successfully in "users_table" table.');
	});

	it('deleteTableRow deletes, confirms and emits rowDeleted', async () => {
		const fetch = mockFetch(jsonResponse(null));
		const showSuccessSnackbar = vi.spyOn(useNotificationsStore(), 'showSuccessSnackbar');
		const listener = vi.fn();
		tableEvents.on('rowDeleted', listener);

		await useTableRowStore().deleteTableRow('12345678', 'users_table', { id: 11 });

		expect(fetch.last().method).toBe('DELETE');
		expect(fetch.last().url).toBe('/api/table/row/12345678?id=11&tableName=users_table');
		expect(showSuccessSnackbar).toHaveBeenCalledWith('Row has been deleted successfully from "users_table" table.');
		expect(listener).toHaveBeenCalledWith({ connectionID: '12345678', tableName: 'users_table' });
	});

	it('deleteTableRow shows an error snackbar and emits nothing on failure', async () => {
		mockFetch(jsonResponse(fakeError, 400));
		const showErrorSnackbar = vi.spyOn(useNotificationsStore(), 'showErrorSnackbar');
		const listener = vi.fn();
		tableEvents.on('rowDeleted', listener);
		await expect(useTableRowStore().deleteTableRow('1', 't', { id: 1 })).rejects.toThrow();
		expect(showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
		expect(listener).not.toHaveBeenCalled();
	});
});
