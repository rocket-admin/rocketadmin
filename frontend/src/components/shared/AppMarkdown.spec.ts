import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import AppMarkdown from './AppMarkdown.vue';

const mermaidMock = vi.hoisted(() => ({ initialize: vi.fn(), run: vi.fn(() => Promise.resolve()) }));
vi.mock('mermaid', () => ({ default: mermaidMock }));

/**
 * Parsing and sanitizing are pinned in `src/lib/markdown.spec.ts`; this covers the component.
 *
 * Queries go through `.app-markdown` rather than `wrapper.element`: the template's leading
 * eslint-disable comment survives in dev builds, so test-utils sees a comment as the first root.
 */
const root = (wrapper: ReturnType<typeof mount>) => wrapper.get('.app-markdown');
describe('AppMarkdown', () => {
	it('renders markdown to HTML', () => {
		const wrapper = mount(AppMarkdown, { props: { source: '# Title\n\nSome **bold** and `code`.' } });

		expect(wrapper.get('h1').text()).toBe('Title');
		expect(wrapper.get('strong').text()).toBe('bold');
		expect(wrapper.get('code').text()).toBe('code');
	});

	it('renders GFM tables', () => {
		const wrapper = mount(AppMarkdown, { props: { source: '| a | b |\n| - | - |\n| 1 | 2 |' } });

		expect(wrapper.findAll('td').map((cell) => cell.text())).toEqual(['1', '2']);
	});

	it('sanitizes script and event-handler HTML out of the source', () => {
		const wrapper = mount(AppMarkdown, {
			props: { source: 'Hi <script>alert(1)</script><img src="x" onerror="alert(2)"> [x](javascript:alert(3))' },
		});

		expect(wrapper.find('script').exists()).toBe(false);
		expect(wrapper.get('img').attributes('onerror')).toBeUndefined();
		expect(wrapper.html()).not.toContain('javascript:');
	});

	it('renders nothing for a null source', () => {
		expect(root(mount(AppMarkdown, { props: { source: null } })).element.innerHTML).toBe('');
	});

	it('renders inline without block wrappers', () => {
		const wrapper = mount(AppMarkdown, { props: { source: 'one *two*', inline: true } });

		expect(wrapper.find('p').exists()).toBe(false);
		expect(wrapper.get('em').text()).toBe('two');
		expect(root(wrapper).classes()).toContain('app-markdown--inline');
	});

	it('updates when the source changes', async () => {
		const wrapper = mount(AppMarkdown, { props: { source: 'first' } });
		await wrapper.setProps({ source: 'second' });

		expect(root(wrapper).text()).toBe('second');
	});
});

describe('AppMarkdown with mermaid', () => {
	it('renders ```mermaid blocks through mermaid, lazily', async () => {
		const wrapper = mount(AppMarkdown, {
			props: { source: 'Intro\n\n```mermaid\ngraph TD; A-->B\n```', mermaid: true },
		});
		await flushPromises();

		expect(mermaidMock.initialize).toHaveBeenCalledWith(expect.objectContaining({ startOnLoad: false }));
		const diagram = wrapper.get('div.mermaid');
		expect(diagram.text()).toBe('graph TD; A-->B');
		expect(wrapper.find('code.language-mermaid').exists()).toBe(false);
		expect(mermaidMock.run).toHaveBeenCalledWith({ nodes: [diagram.element], suppressErrors: true });
	});

	it('leaves mermaid fences as code without the prop', async () => {
		mermaidMock.run.mockClear();
		const wrapper = mount(AppMarkdown, { props: { source: '```mermaid\ngraph TD; A-->B\n```' } });
		await flushPromises();

		expect(wrapper.find('code.language-mermaid').exists()).toBe(true);
		expect(mermaidMock.run).not.toHaveBeenCalled();
	});

	it('renders diagrams that arrive in a later source (streamed answers)', async () => {
		mermaidMock.run.mockClear();
		const wrapper = mount(AppMarkdown, { props: { source: 'Thinking', mermaid: true } });
		await flushPromises();
		expect(mermaidMock.run).not.toHaveBeenCalled();

		await wrapper.setProps({ source: 'Done\n\n```mermaid\npie\n```' });
		await flushPromises();

		expect(wrapper.get('div.mermaid').text()).toBe('pie');
		expect(mermaidMock.run).toHaveBeenCalledTimes(1);
	});
});
