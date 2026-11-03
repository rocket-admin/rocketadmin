import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { nextTick } from 'vue';
import { useConnectionsStore } from '@/stores/connections';
import { useS3Store } from '@/stores/s3';
import { useTablesStore } from '@/stores/tables';
import { mockWidgetStructure } from '../stories.mocks';
import S3RecordView from './S3RecordView.vue';

const params = (type: 'file' | 'image') =>
	mockWidgetStructure(
		{
			bucket: 'my-bucket',
			type,
			access_key_id: 'COMPANY-SECRET/bucket-access-key-id',
			access_key: 'COMPANY-SECRET/bucket-access-key',
		},
		{ field_name: 'avatar' },
	);

describe('S3RecordView', () => {
	let getFileUrl: MockInstance<ReturnType<typeof useS3Store>['getFileUrl']>;

	beforeEach(() => {
		setActivePinia(createPinia());
		useConnectionsStore().connectionID = 'conn-1';
		useTablesStore().setTableName('test_table');
		getFileUrl = vi
			.spyOn(useS3Store(), 'getFileUrl')
			.mockResolvedValue({ url: 'https://s3.example.com/file.jpg', key: 'k', expiresIn: 60 });
	});

	it('shows the key for the file type without fetching', () => {
		const wrapper = mount(S3RecordView, {
			props: { value: 'uploads/doc.pdf', widgetStructure: params('file'), primaryKeys: { id: 1 } },
		});
		expect(wrapper.text()).toBe('uploads/doc.pdf');
		expect(getFileUrl).not.toHaveBeenCalled();
	});

	it('renders a dash for an empty file value', () => {
		expect(mount(S3RecordView, { props: { value: null, widgetStructure: params('file') } }).text()).toBe('—');
	});

	it('fetches and previews an image', async () => {
		const wrapper = mount(S3RecordView, {
			props: { value: 'uploads/a.jpg', widgetStructure: params('image'), primaryKeys: { id: 1 } },
		});
		await nextTick();
		expect(wrapper.find('[role="status"]').exists()).toBe(true);
		await flushPromises();
		expect(getFileUrl).toHaveBeenCalledWith('conn-1', 'test_table', 'avatar', { id: 1 });
		expect(wrapper.find('img').attributes('src')).toBe('https://s3.example.com/file.jpg');
	});

	it('shows a placeholder when the URL cannot be fetched', async () => {
		getFileUrl.mockResolvedValue(null);
		const wrapper = mount(S3RecordView, {
			props: { value: 'uploads/a.jpg', widgetStructure: params('image'), primaryKeys: { id: 1 } },
		});
		await flushPromises();
		expect(wrapper.find('img').exists()).toBe(false);
		expect(wrapper.text()).toBe('[S3 Image]');
	});

	it('does not fetch without primary keys', () => {
		mount(S3RecordView, { props: { value: 'uploads/a.jpg', widgetStructure: params('image') } });
		expect(getFileUrl).not.toHaveBeenCalled();
	});

	it('accepts widget params as a JSON string', () => {
		// The API sometimes sends widget_params unparsed.
		const unparsed: unknown = JSON.stringify({ type: 'image', bucket: 'b' });
		const structure = { ...params('image'), widget_params: unparsed as Record<string, unknown> };
		const wrapper = mount(S3RecordView, {
			props: { value: 'k', widgetStructure: structure },
		});
		expect(wrapper.text()).toBe('[S3 Image]');
	});
});
