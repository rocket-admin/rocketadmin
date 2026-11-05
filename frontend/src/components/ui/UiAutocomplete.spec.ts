import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import type { AutocompleteOption } from './selectOption';
import UiAutocomplete from './UiAutocomplete.vue';
import UiField from './UiField.vue';

/**
 * jsdom has no popover API and no layout, so these assert the APG combobox contract: the input
 * keeps focus, `aria-expanded` / `aria-activedescendant` track the virtual cursor, and the keys do
 * what the pattern says.
 */

const COUNTRIES: AutocompleteOption<string>[] = [
	{ value: 'de', label: 'Germany' },
	{ value: 'fr', label: 'France', disabled: true },
	{ value: 'it', label: 'Italy' },
	{ value: 'es', label: 'Spain' },
];

let wrapper: ReturnType<typeof mountAutocomplete> | undefined;

function mountAutocomplete(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
	return mount(UiAutocomplete, {
		props: { options: COUNTRIES, modelValue: '', ...props },
		attrs: { 'aria-label': 'Country', ...attrs },
		attachTo: document.body,
	});
}

afterEach(() => {
	wrapper?.unmount();
	wrapper = undefined;
});

const input = () => wrapper!.get('input');
const options = () => wrapper!.findAll('[role="option"]');
const expanded = () => input().attributes('aria-expanded');
const activeDescendant = () => input().attributes('aria-activedescendant');
const activeLabel = () => {
	const id = activeDescendant();
	return id ? document.getElementById(id)?.textContent?.trim() : undefined;
};
const key = (name: string) => input().trigger('keydown', { key: name });

describe('UiAutocomplete', () => {
	describe('combobox wiring', () => {
		it('is a combobox controlling its listbox', () => {
			wrapper = mountAutocomplete();
			const listId = input().attributes('aria-controls');

			expect(input().attributes('role')).toBe('combobox');
			expect(input().attributes('aria-autocomplete')).toBe('list');
			expect(input().attributes('autocomplete')).toBe('off');
			expect(listId).toBeTruthy();
			expect(wrapper.get('[role="listbox"]').attributes('id')).toBe(listId);
		});

		it('starts collapsed with no active descendant', () => {
			wrapper = mountAutocomplete();

			expect(expanded()).toBe('false');
			expect(activeDescendant()).toBeUndefined();
		});

		it('expands on focus', async () => {
			wrapper = mountAutocomplete();
			await input().trigger('focus');

			expect(expanded()).toBe('true');
			expect(options().map((option) => option.text())).toEqual(['Germany', 'France', 'Italy', 'Spain']);
		});

		it('stays collapsed with no options and no emptyText', async () => {
			wrapper = mountAutocomplete({ options: [] });
			await input().trigger('focus');

			expect(expanded()).toBe('false');
		});

		it('marks disabled options aria-disabled', async () => {
			wrapper = mountAutocomplete();
			await input().trigger('focus');

			expect(options()[1]!.attributes('aria-disabled')).toBe('true');
			expect(options()[0]!.attributes('aria-disabled')).toBeUndefined();
		});
	});

	describe('keyboard', () => {
		it('ArrowDown opens the list and activates the first option', async () => {
			wrapper = mountAutocomplete();
			await key('ArrowDown');

			expect(expanded()).toBe('true');
			expect(activeLabel()).toBe('Germany');
			expect(options()[0]!.attributes('aria-selected')).toBe('true');
		});

		it('ArrowDown skips disabled options', async () => {
			wrapper = mountAutocomplete();
			await key('ArrowDown');
			await key('ArrowDown');

			expect(activeLabel()).toBe('Italy');
		});

		it('ArrowDown wraps from the last option to the first', async () => {
			wrapper = mountAutocomplete();
			for (let i = 0; i < 4; i++) await key('ArrowDown');

			expect(activeLabel()).toBe('Germany');
		});

		it('ArrowUp opens on the last option and walks back past disabled ones', async () => {
			wrapper = mountAutocomplete();
			await key('ArrowUp');
			expect(activeLabel()).toBe('Spain');

			await key('ArrowUp');
			await key('ArrowUp');
			expect(activeLabel()).toBe('Germany');
		});

		it('Enter picks the active option: sets the text to its label and emits select', async () => {
			wrapper = mountAutocomplete();
			await key('ArrowDown');
			await key('ArrowDown');
			await key('Enter');

			expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Italy']);
			expect(wrapper.emitted('select')?.at(-1)).toEqual([COUNTRIES[2]]);
			expect(expanded()).toBe('false');
		});

		it('Enter with nothing active does nothing and lets the form submit', async () => {
			wrapper = mountAutocomplete();
			await input().trigger('focus');
			const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
			input().element.dispatchEvent(event);

			expect(wrapper.emitted('select')).toBeUndefined();
			expect(event.defaultPrevented).toBe(false);
		});

		it('Escape closes the list without propagating', async () => {
			wrapper = mountAutocomplete();
			const outer = vi.fn();
			await key('ArrowDown');
			document.body.addEventListener('keydown', outer);
			await key('Escape');
			document.body.removeEventListener('keydown', outer);

			expect(expanded()).toBe('false');
			expect(activeDescendant()).toBeUndefined();
			expect(outer).not.toHaveBeenCalled();
		});

		it('Escape on a closed list propagates, so an enclosing dialog can close', async () => {
			wrapper = mountAutocomplete();
			const outer = vi.fn();
			document.body.addEventListener('keydown', outer);
			await key('Escape');
			document.body.removeEventListener('keydown', outer);

			expect(outer).toHaveBeenCalledOnce();
		});

		it('Tab closes the list', async () => {
			wrapper = mountAutocomplete();
			await input().trigger('focus');
			await key('Tab');

			expect(expanded()).toBe('false');
		});
	});

	describe('autoActiveFirst', () => {
		it('activates the first option as the list opens', async () => {
			wrapper = mountAutocomplete({ autoActiveFirst: true });
			await input().trigger('focus');

			expect(activeLabel()).toBe('Germany');
		});

		it('skips a disabled first option', async () => {
			wrapper = mountAutocomplete({ autoActiveFirst: true, options: [COUNTRIES[1]!, COUNTRIES[2]!] });
			await input().trigger('focus');

			expect(activeLabel()).toBe('Italy');
		});

		it('re-activates the first option when the options change', async () => {
			wrapper = mountAutocomplete({ autoActiveFirst: true });
			await input().trigger('focus');
			await key('ArrowDown');
			await wrapper.setProps({ options: [COUNTRIES[3]!, COUNTRIES[0]!] });

			expect(activeLabel()).toBe('Spain');
		});

		it('ArrowDown on a re-opened list lands on the first option, not the second', async () => {
			// Regression: opening already activated the first option, then ArrowDown stepped past it.
			wrapper = mountAutocomplete({ autoActiveFirst: true });
			await input().trigger('focus');
			await key('Escape');
			await key('ArrowDown');

			expect(activeLabel()).toBe('Germany');
		});

		it('lets Enter pick without any arrow key', async () => {
			wrapper = mountAutocomplete({ autoActiveFirst: true });
			await input().setValue('Ger');
			await key('Enter');

			expect(wrapper.emitted('select')?.at(-1)).toEqual([COUNTRIES[0]]);
		});

		it('without it, typing activates nothing', async () => {
			wrapper = mountAutocomplete();
			await input().setValue('Ger');

			expect(expanded()).toBe('true');
			expect(activeDescendant()).toBeUndefined();
		});
	});

	describe('typing and picking', () => {
		it('emits the typed text and opens', async () => {
			wrapper = mountAutocomplete();
			await input().setValue('Ita');

			expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Ita']);
			expect(expanded()).toBe('true');
		});

		it('renders a null model as empty', () => {
			wrapper = mountAutocomplete({ modelValue: null });

			expect((input().element as HTMLInputElement).value).toBe('');
		});

		it('picks an option on click', async () => {
			wrapper = mountAutocomplete();
			await input().trigger('focus');
			await options()[3]!.trigger('click');

			expect(wrapper.emitted('select')?.at(-1)).toEqual([COUNTRIES[3]]);
			expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Spain']);
			expect(expanded()).toBe('false');
		});

		it('ignores a click on a disabled option', async () => {
			wrapper = mountAutocomplete();
			await input().trigger('focus');
			await options()[1]!.trigger('click');

			expect(wrapper.emitted('select')).toBeUndefined();
			expect(expanded()).toBe('true');
		});

		it('renders the option slot', async () => {
			wrapper = mount(UiAutocomplete, {
				props: { options: COUNTRIES, modelValue: '' },
				attrs: { 'aria-label': 'Country' },
				slots: { option: ({ option }: { option: AutocompleteOption }) => `[${String(option.value)}] ${option.label}` },
				attachTo: document.body,
			});
			await input().trigger('focus');

			expect(options()[0]!.text()).toBe('[de] Germany');
		});
	});

	describe('emptyText and loading', () => {
		it('shows emptyText as a disabled row when there are no options', async () => {
			wrapper = mountAutocomplete({ options: [], emptyText: 'No matches' });
			await input().setValue('zz');

			expect(expanded()).toBe('true');
			expect(options()).toHaveLength(1);
			expect(options()[0]!.text()).toBe('No matches');
			expect(options()[0]!.attributes('aria-disabled')).toBe('true');
		});

		it('Enter on the empty row picks nothing', async () => {
			wrapper = mountAutocomplete({ options: [], emptyText: 'No matches', autoActiveFirst: true });
			await input().setValue('zz');
			await key('ArrowDown');
			await key('Enter');

			expect(wrapper.emitted('select')).toBeUndefined();
		});

		it('shows a labelled spinner while loading, and no empty row', async () => {
			wrapper = mountAutocomplete({ options: [], emptyText: 'No matches', loading: true });
			await input().setValue('zz');

			expect(wrapper.find('.ui-autocomplete__spinner').exists()).toBe(true);
			expect(wrapper.text()).toContain('Loading suggestions');
			expect(wrapper.text()).not.toContain('No matches');
		});

		it('shows no spinner when idle', () => {
			wrapper = mountAutocomplete();

			expect(wrapper.find('.ui-autocomplete__spinner').exists()).toBe(false);
		});
	});

	describe('disabled and readonly', () => {
		it.each(['disabled', 'readonly'])('does not open when %s', async (state) => {
			wrapper = mountAutocomplete({ [state]: true });
			await input().trigger('focus');
			await key('ArrowDown');

			expect(expanded()).toBe('false');
			expect(activeDescendant()).toBeUndefined();
			expect(input().attributes(state)).toBeDefined();
		});

		it('adds the disabled modifier', () => {
			wrapper = mountAutocomplete({ disabled: true });

			expect(wrapper.classes()).toContain('ui-autocomplete--disabled');
		});
	});

	it('closes on a pointerdown outside', async () => {
		wrapper = mountAutocomplete();
		await input().trigger('focus');
		document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
		await wrapper.vm.$nextTick();

		expect(expanded()).toBe('false');
	});

	it('puts layout class/style on the bordered root and other attrs on the input', () => {
		wrapper = mountAutocomplete({}, { class: 'filters__country', style: 'width: 10rem', name: 'country' });

		expect(wrapper.classes()).toContain('filters__country');
		expect(wrapper.attributes('style')).toContain('width');
		expect(input().classes()).not.toContain('filters__country');
		expect(input().attributes('name')).toBe('country');
		expect(input().attributes('aria-label')).toBe('Country');
	});

	it('exposes focus()', () => {
		wrapper = mountAutocomplete();
		(wrapper.vm as unknown as { focus: () => void }).focus();

		expect(document.activeElement).toBe(input().element);
	});

	it('marks itself invalid standalone', () => {
		wrapper = mountAutocomplete({ invalid: true });

		expect(input().attributes('aria-invalid')).toBe('true');
		expect(wrapper.classes()).toContain('ui-autocomplete--invalid');
	});

	it('adds the size modifier', () => {
		wrapper = mountAutocomplete({ size: 'sm' });

		expect(wrapper.classes()).toContain('ui-autocomplete--size-sm');
	});

	describe('inside a UiField', () => {
		it('takes the field id, description, invalid and required state', () => {
			const field = mount(UiField, {
				props: { label: 'Country', hint: 'Start typing', error: 'Required', required: true },
				slots: { default: () => h(UiAutocomplete, { options: COUNTRIES }) },
			});
			const control = field.get('input');
			const ids = control.attributes('aria-describedby')?.split(' ');

			expect(field.get('label').attributes('for')).toBe(control.attributes('id'));
			expect(ids).toContain(field.get('.ui-field__hint').attributes('id'));
			expect(ids).toContain(field.get('.ui-field__error').attributes('id'));
			expect(control.attributes('aria-invalid')).toBe('true');
			expect(control.attributes('required')).toBeDefined();
		});
	});
});
