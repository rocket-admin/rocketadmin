import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiField from './UiField.vue';
import UiInput from './UiInput.vue';

/**
 * Label, hint, error — and the `aria-describedby` wiring between them, which **exists nowhere in
 * the app today**. Inspect a rendered input in the DOM panel: its `aria-describedby` should name
 * the hint and error nodes, and its `id` should match the label's `for`.
 *
 * `UiField` and `UiInput` are separate components so a field can also wrap a `<select>`, a
 * `<textarea>` or the Turnstile widget — see the _Wrapping A Select_ story.
 */
const meta = {
	title: 'UI/Field',
	component: UiField,
	subcomponents: { UiInput },
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: { label: 'Email address', required: false },
	render: (args) => ({
		components: { UiField, UiInput },
		setup: () => ({ args }),
		template: `
      <div style="max-width: 22rem;">
        <UiField v-bind="args"><UiInput type="email" placeholder="you@company.com" /></UiField>
      </div>
    `,
	}),
} satisfies Meta<typeof UiField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = {
	args: { hint: 'We only use this for sign-in and billing receipts.' },
};

/** The error sets `aria-invalid` on the control *and* is referenced by `aria-describedby`. */
export const WithError: Story = {
	args: { error: 'Enter a valid email address.' },
};

/**
 * Both at once. The hint stays in `aria-describedby` alongside the error — it usually states the
 * rule the error is complaining about, so silencing it would lose the fix.
 */
export const WithHintAndError: Story = {
	args: {
		hint: 'At least 12 characters, including a number.',
		error: 'That password is too short.',
		label: 'Password',
	},
};

export const Required: Story = { args: { required: true } };

/** The label sits on the control's top border — for dense rows such as the filters dialog. */
export const FloatingLabel: Story = { args: { floatingLabel: true } };

export const Disabled: Story = {
	render: (args) => ({
		components: { UiField, UiInput },
		setup: () => ({ args }),
		template: `
      <div style="max-width: 22rem;">
        <UiField v-bind="args"><UiInput type="email" model-value="you@company.com" disabled /></UiField>
      </div>
    `,
	}),
};

/**
 * The scoped slot exposes `inputId` / `describedBy` / `invalid`, so a control that isn't `UiInput`
 * wires up identically. This is why the two components are split.
 */
export const WrappingASelect: Story = {
	args: { label: 'Plan', hint: 'You can change this at any time.' },
	render: (args) => ({
		components: { UiField },
		setup: () => ({ args }),
		template: `
      <div style="max-width: 22rem;">
        <UiField v-bind="args">
          <template #default="{ inputId, describedBy, invalid }">
            <select
              :id="inputId"
              :aria-describedby="describedBy"
              :aria-invalid="invalid || undefined"
              style="
                padding: 0.625rem 0.75rem;
                border: 1px solid var(--color-line);
                border-radius: var(--radius-control);
                font-size: var(--text-base);
                background: var(--color-surface);
                color: var(--color-ink);
              "
            >
              <option>Free</option>
              <option>Pro</option>
            </select>
          </template>
        </UiField>
      </div>
    `,
	}),
};

/**
 * Every state, plus both input sizes. The two-fields-in-one-form arrangement is also the `useId`
 * regression guard: if the generated ids ever collide, clicking the second label focuses the
 * first input.
 */
export const AllVariants: Story = {
	render: () => ({
		components: { UiField, UiInput },
		template: `
      <form style="display: grid; gap: 1.25rem; max-width: 22rem;">
        <UiField label="Default"><UiInput placeholder="Placeholder" /></UiField>
        <UiField label="With hint" hint="Supplementary guidance."><UiInput /></UiField>
        <UiField label="With error" error="Something is wrong."><UiInput /></UiField>
        <UiField label="Hint and error" hint="The rule." error="The violation."><UiInput /></UiField>
        <UiField label="Required" required><UiInput /></UiField>
        <UiField label="Disabled"><UiInput model-value="Locked" disabled /></UiField>
        <UiField label="Small control"><UiInput size="sm" placeholder="Dense row" /></UiField>
        <UiField label="Floating label" floating-label><UiInput /></UiField>
      </form>
    `,
	}),
};
