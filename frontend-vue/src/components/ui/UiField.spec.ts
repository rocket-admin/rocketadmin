import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import UiField from './UiField.vue';
import UiInput from './UiInput.vue';

/**
 * The highest-value spec in the design system: it pins the ARIA wiring that **exists nowhere in the
 * app today**. Before `UiField`, all four hand-rolled field copies rendered the error as an
 * unassociated sibling `<p>`, so a screenreader user heard the label and never learned why
 * submission failed.
 */

/** A field wrapping a real UiInput — the composition every call site actually uses. */
function mountField(props: Record<string, unknown> = {}) {
	return mount(UiField, {
		props: { label: 'Email', ...props },
		slots: { default: () => h(UiInput, { type: 'email' }) },
	});
}

describe('UiField + UiInput', () => {
	describe('label association', () => {
		it('points the label at the input it wraps', () => {
			const wrapper = mountField();
			const inputId = wrapper.find('input').attributes('id');

			expect(inputId).toBeTruthy();
			expect(wrapper.find('label').attributes('for')).toBe(inputId);
		});

		it('gives two fields on one page distinct ids', () => {
			// The useId regression guard. Two fields sharing an id means clicking one label focuses the
			// other input, and both announce the same name.
			const Host = defineComponent({
				components: { UiField, UiInput },
				template: `
          <form>
            <UiField label="Email"><UiInput /></UiField>
            <UiField label="Password"><UiInput /></UiField>
          </form>
        `,
			});
			const wrapper = mount(Host);
			const [first, second] = wrapper.findAll('input').map((i) => i.attributes('id'));

			expect(first).toBeTruthy();
			expect(first).not.toBe(second);
		});
	});

	describe('aria-describedby', () => {
		it('is absent when there is neither hint nor error', () => {
			expect(mountField().find('input').attributes('aria-describedby')).toBeUndefined();
		});

		it('references the error node', () => {
			const wrapper = mountField({ error: 'Enter a valid email' });
			const describedBy = wrapper.find('input').attributes('aria-describedby');
			const errorId = wrapper.find('.ui-field__error').attributes('id');

			expect(errorId).toBeTruthy();
			expect(describedBy?.split(' ')).toContain(errorId);
		});

		it('references the hint node', () => {
			const wrapper = mountField({ hint: 'Work address' });
			const hintId = wrapper.find('.ui-field__hint').attributes('id');

			expect(wrapper.find('input').attributes('aria-describedby')?.split(' ')).toContain(hintId);
		});

		it('references hint and error together when both are present', () => {
			// An error must not silence the hint — the hint usually states the rule being violated.
			const wrapper = mountField({ hint: 'Work address', error: 'Enter a valid email' });
			const ids = wrapper.find('input').attributes('aria-describedby')?.split(' ') ?? [];

			expect(ids).toContain(wrapper.find('.ui-field__hint').attributes('id'));
			expect(ids).toContain(wrapper.find('.ui-field__error').attributes('id'));
			expect(ids).toHaveLength(2);
		});
	});

	describe('invalid state', () => {
		it('sets aria-invalid only when there is an error', () => {
			expect(mountField().find('input').attributes('aria-invalid')).toBeUndefined();
			expect(mountField({ error: 'Bad' }).find('input').attributes('aria-invalid')).toBe('true');
		});

		it('marks the control with the invalid modifier class', () => {
			expect(mountField({ error: 'Bad' }).find('input').classes()).toContain('ui-input--invalid');
		});
	});

	describe('required', () => {
		it('forwards required to the control and marks the label decoratively', () => {
			const wrapper = mountField({ required: true });

			expect(wrapper.find('input').attributes('required')).toBeDefined();
			// The asterisk is aria-hidden: `required` on the control is what AT reads.
			expect(wrapper.find('.ui-field__required').attributes('aria-hidden')).toBe('true');
		});
	});

	describe('floating label', () => {
		it('adds the modifier only when asked, keeping the label linked to the control', () => {
			expect(mountField().classes()).not.toContain('ui-field--floating-label');

			const wrapper = mountField({ floatingLabel: true });
			expect(wrapper.classes()).toContain('ui-field--floating-label');
			expect(wrapper.find('label').attributes('for')).toBe(wrapper.find('input').attributes('id'));
		});
	});

	describe('scoped slot', () => {
		it('exposes the wiring so a non-UiInput control can use it', () => {
			// This is what lets a field wrap a <select>, a <textarea> or the Turnstile widget.
			const wrapper = mount(UiField, {
				props: { label: 'Plan', error: 'Pick one' },
				slots: {
					default: (slotProps: Record<string, unknown>) =>
						h('select', {
							id: slotProps.inputId as string,
							'aria-describedby': slotProps.describedBy as string,
							'aria-invalid': slotProps.invalid ? 'true' : undefined,
						}),
				},
			});
			const select = wrapper.find('select');

			expect(select.attributes('id')).toBe(wrapper.find('label').attributes('for'));
			expect(select.attributes('aria-describedby')).toBe(wrapper.find('.ui-field__error').attributes('id'));
			expect(select.attributes('aria-invalid')).toBe('true');
		});
	});
});

describe('UiInput', () => {
	it('round-trips v-model', async () => {
		const wrapper = mount(UiInput, { props: { modelValue: 'before' } });

		expect(wrapper.find('input').element.value).toBe('before');

		await wrapper.find('input').setValue('after');

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['after']);
	});

	it('works standalone, with the caller supplying invalid', () => {
		// No UiField ancestor: the injected context is absent and nothing should throw.
		const wrapper = mount(UiInput, { props: { invalid: true } });

		expect(wrapper.find('input').attributes('aria-invalid')).toBe('true');
		expect(wrapper.find('input').attributes('aria-describedby')).toBeUndefined();
	});

	it('lets an explicit invalid prop override the field context', () => {
		const wrapper = mount(UiField, {
			props: { label: 'Email', error: 'Bad' },
			slots: { default: () => h(UiInput, { invalid: false }) },
		});

		expect(wrapper.find('input').attributes('aria-invalid')).toBeUndefined();
	});

	it('forwards arbitrary attributes onto the control itself', () => {
		// inheritAttrs: false — without the explicit v-bind these would land nowhere useful.
		const wrapper = mount(UiInput, { attrs: { name: 'email', maxlength: '80' } });

		expect(wrapper.find('input').attributes('name')).toBe('email');
		expect(wrapper.find('input').attributes('maxlength')).toBe('80');
	});

	it('lands size as a modifier class and passes type through', () => {
		const wrapper = mount(UiInput, { props: { size: 'sm', type: 'password' } });

		expect(wrapper.find('input').classes()).toContain('ui-input--size-sm');
		expect(wrapper.find('input').attributes('type')).toBe('password');
	});
});
