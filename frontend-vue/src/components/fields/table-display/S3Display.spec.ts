import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { nextTick } from 'vue';
import { useConnectionsStore } from '@/stores/connections';
import { type BucketFileUrlResponse, useS3Store } from '@/stores/s3';
import { useTablesStore } from '@/stores/tables';
import S3Display from './S3Display.vue';
import { cellText, setupCopy, widget } from './testing';

vi.mock('@/environment', () => ({ environment: { apiRoot: '', saasURL: '' } }));
vi.mock('@/config', () => ({ getConfig: () => ({ baseURL: '/api', saasURL: '' }) }));

const imageWidget = widget(
	{ bucket: 'my-bucket', access_key_id: 'key-id', access_key: 'key', type: 'image' },
	{ field_name: 'avatar' },
);
const rowProps = { rowData: { id: 7, avatar: 'uploads/cat.png' }, primaryKeys: [{ column_name: 'id' }] };

describe('S3Display', () => {
	let getFileUrl: MockInstance<ReturnType<typeof useS3Store>['getFileUrl']>;

	beforeEach(() => {
		setActivePinia(createPinia());
		useConnectionsStore().connectionID = 'test-conn';
		useTablesStore().setTableName('test-table');
		getFileUrl = vi
			.spyOn(useS3Store(), 'getFileUrl')
			.mockResolvedValue({ url: 'https://s3.example.com/cat.png', key: 'uploads/cat.png', expiresIn: 60 });
	});

	afterEach(() => vi.unstubAllGlobals());

	it('shows the key for a file-type widget without fetching', () => {
		const wrapper = mount(S3Display, {
			props: { value: 'uploads/doc.pdf', widgetStructure: widget({ type: 'file' }) },
		});
		expect(cellText(wrapper)).toBe('uploads/doc.pdf');
		expect(getFileUrl).not.toHaveBeenCalled();
	});

	it('shows a dash and no copy button for an empty value', () => {
		const wrapper = mount(S3Display, { props: { value: null } });
		expect(cellText(wrapper)).toBe('—');
		expect(wrapper.find('button').exists()).toBe(false);
	});

	it('loads a thumbnail for the row when type is image', async () => {
		let resolve: (value: BucketFileUrlResponse | null) => void = () => {};
		getFileUrl.mockReturnValue(new Promise((r) => (resolve = r)));
		const wrapper = mount(S3Display, {
			props: { value: 'uploads/cat.png', widgetStructure: imageWidget, ...rowProps },
		});
		await nextTick();
		expect(wrapper.find('[role="status"]').exists()).toBe(true);
		resolve({ url: 'https://s3.example.com/cat.png', key: 'uploads/cat.png', expiresIn: 60 });
		await flushPromises();
		expect(getFileUrl).toHaveBeenCalledWith('test-conn', 'test-table', 'avatar', { id: 7 });
		expect(wrapper.get('img').attributes('src')).toBe('https://s3.example.com/cat.png');
	});

	it('falls back to a caption when the URL cannot be fetched', async () => {
		getFileUrl.mockResolvedValue(null);
		const wrapper = mount(S3Display, {
			props: { value: 'uploads/cat.png', widgetStructure: imageWidget, ...rowProps },
		});
		await flushPromises();
		expect(wrapper.find('img').exists()).toBe(false);
		expect(cellText(wrapper)).toBe('[S3 Image]');
	});

	it('does not fetch without row primary keys', () => {
		mount(S3Display, { props: { value: 'uploads/cat.png', widgetStructure: imageWidget } });
		expect(getFileUrl).not.toHaveBeenCalled();
	});

	it('copies the S3 key', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const wrapper = mount(S3Display, { props: { value: 'uploads/doc.pdf' }, attachTo });
		expect(wrapper.get('button').attributes('aria-label')).toBe('Copy S3 key');
		const result = await clickCopy(wrapper);
		expect(result).toEqual({
			copied: ['uploads/doc.pdf'],
			emitted: [['S3 key was copied to clipboard.']],
			rowClicked: false,
		});
	});
});
