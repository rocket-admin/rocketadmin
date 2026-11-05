import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SchemaDiagramViewer from './SchemaDiagramViewer.vue';

const mermaid = vi.hoisted(() => ({
	initialize: vi.fn(),
	render: vi.fn(),
}));
vi.mock('mermaid', () => ({ default: mermaid }));

const SOURCE =
	'```mermaid\nerDiagram\n  users {\n    int id\n  }\n  orders {\n    int id\n  }\n  orders }o--|| users : places\n```';
const SVG =
	'<svg id="d"><g class="node" id="entity-users"><text>users</text></g><g class="node"><text>orders</text></g></svg>';

function mountViewer(source = SOURCE) {
	return mount(SchemaDiagramViewer, {
		props: { title: 'Current Database Structure', source },
		attachTo: document.body,
	});
}

describe('SchemaDiagramViewer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mermaid.render.mockResolvedValue({ svg: SVG });
	});

	it('renders the source through mermaid without the code fence', async () => {
		const wrapper = mountViewer();
		await flushPromises();

		expect(wrapper.find('h3').text()).toBe('Current Database Structure');
		expect(mermaid.initialize).toHaveBeenCalledWith({ startOnLoad: false, theme: 'default' });
		const code = mermaid.render.mock.calls[0]?.[1];
		expect(code).toBe(
			'erDiagram\n  users {\n    int id\n  }\n  orders {\n    int id\n  }\n  orders }o--|| users : places\n',
		);
		expect(wrapper.find('[data-testid="schema-diagram-canvas"] svg').exists()).toBe(true);
		wrapper.unmount();
	});

	it('re-renders when the source changes', async () => {
		const wrapper = mountViewer();
		await flushPromises();
		await wrapper.setProps({ source: '```mermaid\nerDiagram\n  tags {\n  }\n```' });
		await flushPromises();
		expect(mermaid.render).toHaveBeenCalledTimes(2);
		expect(wrapper.findAll('.schema-diagram__sidebar-item-name').map((item) => item.text())).toEqual(['tags']);
		wrapper.unmount();
	});

	it('says so when mermaid cannot render the source', async () => {
		mermaid.render.mockRejectedValue(new Error('Parse error'));
		const wrapper = mountViewer();
		await flushPromises();
		expect(wrapper.text()).toContain('The diagram could not be rendered.');
		wrapper.unmount();
	});

	it('lists the tables sorted and filters them by the search', async () => {
		const wrapper = mountViewer();
		await flushPromises();
		const items = () => wrapper.findAll('.schema-diagram__sidebar-item-name').map((item) => item.text());
		expect(items()).toEqual(['orders', 'users']);

		await wrapper.find('input[aria-label="Search tables"]').setValue('US');
		expect(items()).toEqual(['users']);

		await wrapper.find('input[aria-label="Search tables"]').setValue('nothing');
		expect(items()).toEqual([]);
		expect(wrapper.text()).toContain('No tables match your search.');
		wrapper.unmount();
	});

	it('toggles the tables list', async () => {
		const wrapper = mountViewer();
		await flushPromises();
		const toggle = wrapper.find('[data-testid="schema-diagram-sidebar-toggle"]');
		expect(toggle.attributes('aria-pressed')).toBe('true');
		await toggle.trigger('click');
		expect(wrapper.find('.schema-diagram__sidebar').exists()).toBe(false);
		expect(toggle.attributes('aria-pressed')).toBe('false');
		wrapper.unmount();
	});

	it('zooms in and out in 25% steps of the fitted scale', async () => {
		const wrapper = mountViewer();
		await flushPromises();
		const zoom = () => wrapper.find('[data-testid="schema-diagram-zoom"]').text();
		expect(zoom()).toBe('100%');
		await wrapper.find('button[aria-label="Zoom in"]').trigger('click');
		expect(zoom()).toBe('125%');
		await wrapper.find('button[aria-label="Zoom out"]').trigger('click');
		await wrapper.find('button[aria-label="Zoom out"]').trigger('click');
		expect(zoom()).toBe('75%');
		wrapper.unmount();
	});

	it('highlights a table picked from the list', async () => {
		const wrapper = mountViewer();
		await flushPromises();
		await wrapper.findAll('.schema-diagram__sidebar-item')[1]?.trigger('click');
		expect(wrapper.find('#entity-users').classes()).toContain('schema-diagram__highlight');
		wrapper.unmount();
	});
});
