// Ports db-table-ai-panel.component.spec.ts as behaviour: what is sent, what the chat shows while
// and after the answer streams in, the suggestions, and closing.
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { type AiStreamChunk, useAiStore } from '@/stores/ai';
import { useConnectionsStore } from '@/stores/connections';
import { useTableStateStore } from '@/stores/table-state';
import { useTablesStore } from '@/stores/tables';
import { textareaRowsFor } from './TableAiPanel.helpers';
import TableAiPanel from './TableAiPanel.vue';

vi.mock('@/lib/cedar-wasm', () => ({ loadCedarWasm: () => new Promise(() => {}) }));
vi.mock('mermaid', () => ({ default: { initialize: vi.fn(), run: vi.fn(() => Promise.resolve()) } }));
const analytics = vi.hoisted(() => ({ trackEvent: vi.fn(), capture: vi.fn() }));
vi.mock('@/composables/useAnalytics', () => ({ trackEvent: analytics.trackEvent }));
vi.mock('posthog-js', () => ({ default: { capture: analytics.capture } }));

async function* mockStream(...chunks: AiStreamChunk[]): AsyncGenerator<AiStreamChunk> {
	for (const chunk of chunks) yield await Promise.resolve(chunk);
}

const text = (content: string): AiStreamChunk => ({ type: 'text', content });

function setup() {
	return mount(TableAiPanel, {
		attachTo: document.body,
		props: { displayName: 'Users', tableColumns: ['id', 'name'], sidebarExpanded: true },
	});
}

function messages(wrapper: ReturnType<typeof mount>) {
	return wrapper
		.findAll('.ai-panel__chain > div')
		.map((element) => ({ type: element.classes()[0], text: element.text() }));
}

async function ask(wrapper: ReturnType<typeof mount>, question: string) {
	await wrapper.find('input[name="welcomeMessage"]').setValue(question);
	await wrapper.find('form.ai-welcome-form').trigger('submit');
	await flushPromises();
}

describe('TableAiPanel', () => {
	let ai: ReturnType<typeof useAiStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		useConnectionsStore().setConnectionID('12345678');
		useTablesStore().setTableName('users');
		ai = useAiStore();
		vi.spyOn(ai, 'createThread').mockResolvedValue({ threadId: 'thread-123', stream: mockStream(text('AI response')) });
		vi.spyOn(ai, 'sendMessage').mockImplementation(async () => mockStream(text('Second answer')));
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('shows the suggestion categories before the first question', () => {
		const wrapper = setup();

		expect(wrapper.findAll('.ai-category__title').map((title) => title.text())).toEqual([
			'Explore',
			'Data Quality',
			'Insights',
		]);
		expect(wrapper.find('.ai-panel__messages').exists()).toBe(false);
	});

	it('creates a thread for the current connection and table with the first question', async () => {
		const wrapper = setup();

		await ask(wrapper, 'How many users?');

		expect(ai.createThread).toHaveBeenCalledWith('12345678', 'users', 'How many users?', expect.any(AbortSignal));
		expect(messages(wrapper)).toEqual([
			{ type: 'user-message', text: 'How many users?' },
			{ type: 'ai-message', text: 'AI response' },
		]);
		expect(analytics.trackEvent).toHaveBeenCalledWith('AI panel: thread created successfully', undefined);
	});

	it('continues the thread with the next questions, on Enter', async () => {
		const wrapper = setup();
		await ask(wrapper, 'First');

		const textarea = wrapper.find('textarea[data-testid="user-message"]');
		await textarea.setValue('Hello');
		await textarea.trigger('keydown', { key: 'Enter' });
		await flushPromises();

		expect(ai.sendMessage).toHaveBeenCalledWith('12345678', 'users', 'thread-123', 'Hello', expect.any(AbortSignal));
		expect(messages(wrapper).at(-1)).toEqual({ type: 'ai-message', text: 'Second answer' });
		expect((textarea.element as HTMLTextAreaElement).value).toBe('');
		expect(wrapper.find('.ai-message-form__count').text()).toBe('0 / 256');
	});

	it('counts characters on keydown and keeps Shift+Enter as a newline', async () => {
		const wrapper = setup();
		await ask(wrapper, 'First');

		const textarea = wrapper.find('textarea');
		await textarea.setValue('Hello');
		await textarea.trigger('keydown', { key: 'a' });
		expect(wrapper.find('.ai-message-form__count').text()).toBe('6 / 256');

		await textarea.trigger('keydown', { key: 'Enter', shiftKey: true });
		expect(ai.sendMessage).not.toHaveBeenCalled();
	});

	it('shows the thinking text until the answer starts, and commits it on thinking_commit', async () => {
		let release: () => void = () => {};
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		async function* stream(): AsyncGenerator<AiStreamChunk> {
			yield { type: 'thinking', content: 'Looking at rows' };
			await gate;
			yield { type: 'thinking_commit' };
			yield text(' and done');
		}
		vi.mocked(ai.createThread).mockResolvedValue({ threadId: 't', stream: stream() });
		const wrapper = setup();

		await ask(wrapper, 'Why?');
		expect(wrapper.find('.ai-thinking').text()).toBe('Looking at rows');
		expect(wrapper.find('.ai-loading').exists()).toBe(true);

		release();
		await flushPromises();
		expect(wrapper.find('.ai-thinking').exists()).toBe(false);
		expect(messages(wrapper).at(-1)?.text).toBe('Looking at rows and done');
		expect(wrapper.find('.ai-loading').exists()).toBe(false);
	});

	it('renders the answer as markdown', async () => {
		vi.mocked(ai.createThread).mockResolvedValue({ threadId: 't', stream: mockStream(text('**bold** answer')) });
		const wrapper = setup();

		await ask(wrapper, 'Q');

		expect(wrapper.find('.ai-message strong').text()).toBe('bold');
	});

	it('shows an unexpected failure in the chat', async () => {
		vi.mocked(ai.createThread).mockRejectedValue('Error message');
		const wrapper = setup();

		await ask(wrapper, 'Q');

		expect(messages(wrapper)[1]).toEqual({ type: 'ai-error-message', text: 'Error message' });
		expect(analytics.trackEvent).toHaveBeenCalledWith('AI panel: thread creation returned an error', undefined);
	});

	it('adds nothing for a request error the client already reported', async () => {
		const error = new ApiError('Bad request', 400, {});
		error.notified = true;
		vi.mocked(ai.createThread).mockRejectedValue(error);
		const wrapper = setup();

		await ask(wrapper, 'Q');

		expect(messages(wrapper)).toEqual([{ type: 'user-message', text: 'Q' }]);
		expect(wrapper.find('.ai-loading').exists()).toBe(false);
	});

	it('opens a suggestion’s completions and asks the picked one', async () => {
		const wrapper = setup();

		const chip = wrapper.findAll('.suggestion-chip').find((element) => element.text() === 'Summarize table');
		await chip?.trigger('click');
		const input = wrapper.find('input[name="welcomeMessage"]').element as HTMLInputElement;
		expect(input.value).toBe('Summarize table');
		const completions = wrapper.findAll('.ai-completions__item');
		expect(completions).toHaveLength(4);

		await completions[1]?.trigger('mouseenter');
		expect(input.value).toBe('Summarize table - what kind of data is stored');
		await wrapper.find('.ai-completions').trigger('mouseleave');
		expect(input.value).toBe('Summarize table');

		await completions[0]?.trigger('mousedown');
		await flushPromises();
		expect(ai.createThread).toHaveBeenCalledWith(
			'12345678',
			'users',
			'Summarize table - structure and content overview',
			expect.any(AbortSignal),
		);
		expect(analytics.trackEvent).toHaveBeenCalledWith('AI panel: suggestion chip clicked', {
			suggestionTitle: 'Summarize table',
		});
	});

	it('closes the completions when clicking elsewhere or typing something else', async () => {
		const wrapper = setup();

		await wrapper.findAll('.suggestion-chip')[0]?.trigger('click');
		expect(wrapper.find('.ai-completions').exists()).toBe(true);
		document.body.click();
		await flushPromises();
		expect(wrapper.find('.ai-completions').exists()).toBe(false);

		await wrapper.findAll('.suggestion-chip')[0]?.trigger('click');
		await wrapper.find('input[name="welcomeMessage"]').setValue('something else');
		expect(wrapper.find('.ai-completions').exists()).toBe(false);
	});

	it('closes through the table state', async () => {
		const tableState = useTableStateStore();
		const handleViewAIpanel = vi.spyOn(tableState, 'handleViewAIpanel');
		const wrapper = setup();

		await wrapper.find('[aria-label="Close AI insights"]').trigger('click');

		expect(handleViewAIpanel).toHaveBeenCalled();
	});

	it('cancels a running request when closed and tracks the chat length', async () => {
		let signal: AbortSignal | undefined;
		vi.mocked(ai.createThread).mockImplementation((_c, _t, _m, s) => {
			signal = s;
			return new Promise(() => {});
		});
		const wrapper = setup();
		await ask(wrapper, 'Q');

		wrapper.unmount();

		expect(signal?.aborted).toBe(true);
		expect(analytics.trackEvent).toHaveBeenCalledWith('AI panel: request cancelled', undefined);
		expect(analytics.trackEvent).toHaveBeenCalledWith('AI panel: destroyed', { messagesLength: 2 });
	});

	it('sizes the textarea for the window height', () => {
		expect([400, 600, 700, 900, 1200].map(textareaRowsFor)).toEqual([1, 2, 3, 4, 5]);
	});
});
