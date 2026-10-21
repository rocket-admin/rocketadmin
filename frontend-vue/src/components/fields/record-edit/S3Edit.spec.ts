import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import type { WidgetStructure } from '@/models/table';
import { useS3Store } from '@/stores/s3';
import S3Edit from './S3Edit.vue';

// The real connections store pulls in the Cedar wasm loader; the widget only reads these two ids.
const connections = reactive({ connectionID: 'conn-123' as string | null });
const tables = reactive({ tableName: 'users' as string | null });
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => connections }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));

const widgetStructure: WidgetStructure = {
	field_name: 'document',
	widget_type: 'S3',
	widget_params: {
		provider: 'aws',
		bucket: 'test-bucket',
		prefix: 'uploads/',
		region: 'us-east-1',
		access_key_id: 'COMPANY-SECRET/bucket-access-key-id',
		access_key: 'COMPANY-SECRET/bucket-access-key',
	},
	name: 'Document Upload',
	description: 'Upload documents to S3',
};

const fileUrlResponse = {
	url: 'https://s3.amazonaws.com/bucket/file.pdf?signature=abc123',
	key: 'uploads/file.pdf',
	expiresIn: 3600,
};
const uploadResponse = {
	key: 'uploads/newfile.pdf',
	previewUrl: 'https://s3.amazonaws.com/bucket/uploads/newfile.pdf?preview=true',
};

type Props = InstanceType<typeof S3Edit>['$props'];

let s3: ReturnType<typeof useS3Store>;

function mountS3(props: Partial<Props> = {}) {
	return mount(S3Edit, {
		props: { fieldKey: 'document', label: 'Document', widgetStructure, rowPrimaryKey: { id: 1 }, ...props },
	});
}

async function selectFile(wrapper: ReturnType<typeof mount>, files: File[]) {
	const input = wrapper.find('input[type="file"]');
	Object.defineProperty(input.element, 'files', { value: files, configurable: true });
	await input.trigger('change');
	await flushPromises();
}

const buttons = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('button');
const findButton = (wrapper: ReturnType<typeof mount>, text: string) =>
	buttons(wrapper).find((b) => b.find('.ui-button__label').text() === text);

beforeEach(() => {
	setActivePinia(createPinia());
	connections.connectionID = 'conn-123';
	tables.tableName = 'users';
	s3 = useS3Store();
	vi.spyOn(s3, 'getFileUrl').mockResolvedValue(fileUrlResponse);
	vi.spyOn(s3, 'uploadFile').mockResolvedValue(uploadResponse);
});

afterEach(() => {
	vi.restoreAllMocks();
});

/** The API sometimes sends `widget_params` as a JSON string, which `WidgetStructure` doesn't model. */
const rawParams = (json: string) => json as unknown as WidgetStructure['widget_params'];

describe('S3Edit', () => {
	it('renders the label, the key and an Upload button', () => {
		const wrapper = mountS3({ value: '' });
		expect(wrapper.find('label').text()).toContain('Document');
		expect(findButton(wrapper, 'Upload')).toBeTruthy();
		expect(s3.getFileUrl).not.toHaveBeenCalled();
	});

	it('loads the preview URL for an existing key', async () => {
		const wrapper = mountS3({ value: 'uploads/photo.jpg' });
		expect(s3.getFileUrl).toHaveBeenCalledTimes(1);
		expect(s3.getFileUrl).toHaveBeenCalledWith('conn-123', 'users', 'document', { id: 1 });
		expect(wrapper.find('[role="status"]').exists()).toBe(true);
		await flushPromises();
		expect(wrapper.find('.s3-edit__thumbnail').attributes('src')).toBe(fileUrlResponse.url);
		expect(findButton(wrapper, 'Open')).toBeTruthy();
	});

	it('loads the preview when a value arrives later', async () => {
		const wrapper = mountS3({ value: '' });
		await wrapper.setProps({ value: 'uploads/new-file.pdf' });
		expect(s3.getFileUrl).toHaveBeenCalledTimes(1);
	});

	it('does not reload once a preview is shown', async () => {
		const wrapper = mountS3({ value: 'uploads/a.pdf' });
		await flushPromises();
		await wrapper.setProps({ value: 'uploads/b.pdf' });
		expect(s3.getFileUrl).toHaveBeenCalledTimes(1);
	});

	it('does not load without a row primary key, connection or table', () => {
		mountS3({ value: 'uploads/file.pdf', rowPrimaryKey: null });
		tables.tableName = null;
		mountS3({ value: 'uploads/file.pdf' });
		expect(s3.getFileUrl).not.toHaveBeenCalled();
	});

	it('keeps no preview when the URL request fails', async () => {
		vi.mocked(s3.getFileUrl).mockResolvedValue(null);
		const wrapper = mountS3({ value: 'uploads/file.pdf' });
		await flushPromises();
		expect(wrapper.find('[role="status"]').exists()).toBe(false);
		expect(findButton(wrapper, 'Open')).toBeUndefined();
	});

	it('shows a file icon and the file name for non-images', async () => {
		const wrapper = mountS3({ value: 'uploads/very-long-filename-that-should-be-truncated-somewhere.pdf' });
		await flushPromises();
		expect(wrapper.find('.s3-edit__thumbnail').exists()).toBe(false);
		expect(wrapper.find('.s3-edit__filename').text()).toBe('...hat-should-be-truncated-somewhere.pdf');
	});

	it.each([
		['photo.JPG', true],
		['uploads/folder/photo.png', true],
		['photo.svg', true],
		['document.pdf', false],
		['file-without-extension', false],
	])('treats %s as image: %s', async (value, expected) => {
		const wrapper = mountS3({ value });
		await flushPromises();
		expect(wrapper.find('.s3-edit__thumbnail').exists()).toBe(expected);
	});

	it('treats any key as an image with type: image, and accepts only images', async () => {
		const wrapper = mountS3({
			value: 'uploads/blob',
			widgetStructure: { ...widgetStructure, widget_params: { ...widgetStructure.widget_params, type: 'image' } },
		});
		await flushPromises();
		expect(wrapper.find('.s3-edit__thumbnail').exists()).toBe(true);
		expect(wrapper.find('input[type="file"]').attributes('accept')).toBe('image/*');
	});

	it('reads widget params from a JSON string', async () => {
		const wrapper = mountS3({
			value: 'uploads/blob',
			widgetStructure: { ...widgetStructure, widget_params: rawParams(JSON.stringify({ type: 'image' })) },
		});
		await flushPromises();
		expect(wrapper.find('.s3-edit__thumbnail').exists()).toBe(true);
	});

	it('uploads a selected file and emits its key', async () => {
		const wrapper = mountS3({ value: '' });
		const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
		await selectFile(wrapper, [file]);
		expect(s3.uploadFile).toHaveBeenCalledWith('conn-123', 'users', 'document', file);
		expect(wrapper.emitted('fieldChange')).toEqual([['uploads/newfile.pdf']]);
		expect((wrapper.find('[data-testid="record-Document-s3"]').element as HTMLInputElement).value).toBe(
			'uploads/newfile.pdf',
		);
		expect(findButton(wrapper, 'Open')).toBeTruthy();
	});

	it('does nothing without a selected file', async () => {
		const wrapper = mountS3({ value: '' });
		await selectFile(wrapper, []);
		expect(s3.uploadFile).not.toHaveBeenCalled();
	});

	it('disables Upload while uploading and re-enables it after a failed upload', async () => {
		let resolve: (value: null) => void = () => {};
		vi.mocked(s3.uploadFile).mockReturnValue(new Promise((r) => (resolve = r)));
		const wrapper = mountS3({ value: '' });
		const input = wrapper.find('input[type="file"]');
		Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'x.pdf')] });
		await input.trigger('change');
		expect(findButton(wrapper, 'Upload')?.attributes('disabled')).toBeDefined();
		resolve(null);
		await flushPromises();
		expect(findButton(wrapper, 'Upload')?.attributes('disabled')).toBeUndefined();
		expect(wrapper.emitted('fieldChange')).toBeUndefined();
	});

	it('disables Upload when disabled or readonly', () => {
		expect(findButton(mountS3({ disabled: true }), 'Upload')?.attributes('disabled')).toBeDefined();
		expect(findButton(mountS3({ readonly: true }), 'Upload')?.attributes('disabled')).toBeDefined();
	});

	it('opens the preview URL in a new tab', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const wrapper = mountS3({ value: 'uploads/file.pdf' });
		await flushPromises();
		await findButton(wrapper, 'Open')?.trigger('click');
		expect(open).toHaveBeenCalledWith(fileUrlResponse.url, '_blank');
	});

	it('emits a typed key', async () => {
		const wrapper = mountS3({ value: '' });
		await wrapper.find('[data-testid="record-Document-s3"]').setValue('new-value.pdf');
		expect(wrapper.emitted('fieldChange')).toEqual([['new-value.pdf']]);
	});
});
