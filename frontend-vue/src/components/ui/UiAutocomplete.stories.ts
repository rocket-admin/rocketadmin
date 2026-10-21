import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { type ConcreteComponent, computed, ref } from 'vue';
import type { AutocompleteOption } from './selectOption';
import UiAutocomplete from './UiAutocomplete.vue';
import UiField from './UiField.vue';
import UiIcon from './UiIcon.vue';

const COUNTRIES: AutocompleteOption<string>[] = [
	{ value: 'at', label: 'Austria' },
	{ value: 'be', label: 'Belgium' },
	{ value: 'de', label: 'Germany' },
	{ value: 'fr', label: 'France', disabled: true },
	{ value: 'it', label: 'Italy' },
	{ value: 'nl', label: 'Netherlands' },
	{ value: 'es', label: 'Spain' },
	{ value: 'ch', label: 'Switzerland' },
];

/** The caller filters; these stories use a plain substring match. */
function useFiltered() {
	const text = ref('');
	const options = computed(() =>
		COUNTRIES.filter((country) => country.label.toLowerCase().includes(text.value.toLowerCase())),
	);
	return { text, options };
}

/**
 * Text input with a suggestion list (APG combobox): focus stays in the input, ArrowUp / ArrowDown
 * move the highlight, Enter picks, Escape closes the list (and only the list, inside a modal).
 *
 * Filtering is the caller's — `v-model` is the typed text and `options` is what to show for it.
 * Picking an option emits `select` and sets the text to the option's label.
 */
// `component` is widened and `Meta` left untyped: Storybook's types cannot infer args from a
// generic SFC (`<script setup generic="T">`). Autodocs still reads the props from the component.
const meta = {
	title: 'UI/Autocomplete',
	component: UiAutocomplete as ConcreteComponent,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: {
		options: COUNTRIES,
		autoActiveFirst: false,
		loading: false,
		emptyText: 'No countries match',
		placeholder: 'Start typing a country',
		size: 'md',
		disabled: false,
		readonly: false,
	},
	argTypes: { size: { control: 'inline-radio', options: ['sm', 'md'] }, options: { control: false } },
	render: (args) => ({
		components: { UiAutocomplete, UiField },
		setup: () => {
			const { text, options } = useFiltered();
			const picked = ref<AutocompleteOption<string> | null>(null);
			return { args, text, options, picked };
		},
		template: `
      <div style="max-width: 22rem; display: grid; gap: 0.75rem;">
        <UiField label="Country">
          <UiAutocomplete v-bind="args" v-model="text" :options="options" @select="picked = $event" />
        </UiField>
        <code>select: {{ picked ? picked.value : '—' }}</code>
      </div>
    `,
	}),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The first match is highlighted as the list opens, so typing then Enter picks it. */
export const AutoActiveFirst: Story = { args: { autoActiveFirst: true } };

/** Server-side suggestions: the spinner shows while `loading`, and the empty row is held back. */
export const Loading: Story = {
	render: (args) => ({
		components: { UiAutocomplete, UiField },
		setup: () => ({ args }),
		template: `
      <div style="max-width: 22rem;">
        <UiField label="Country">
          <UiAutocomplete v-bind="args" model-value="Ger" :options="[]" loading />
        </UiField>
      </div>
    `,
	}),
};

/** The `option` slot renders a row's content; `leading` / `trailing` sit inside the border. */
export const WithSlots: Story = {
	render: () => ({
		components: { UiAutocomplete, UiField, UiIcon },
		setup: () => useFiltered(),
		template: `
      <div style="max-width: 22rem;">
        <UiField label="Country">
          <UiAutocomplete v-model="text" :options="options" placeholder="Search">
            <template #leading><UiIcon name="search" /></template>
            <template #option="{ option, active }">
              <code style="min-width: 2ch;">{{ option.value }}</code>
              <span :style="{ fontWeight: active ? 600 : 400 }">{{ option.label }}</span>
            </template>
          </UiAutocomplete>
        </UiField>
      </div>
    `,
	}),
};

/** Every closed state, both sizes. Focus one to see the list. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiAutocomplete, UiField },
		setup: () => ({ options: COUNTRIES }),
		template: `
      <form style="display: grid; gap: 1.25rem; max-width: 22rem;">
        <UiField label="Default"><UiAutocomplete :options="options" placeholder="Start typing" /></UiField>
        <UiField label="With value" hint="Picked from the list."><UiAutocomplete :options="options" model-value="Germany" /></UiField>
        <UiField label="With error" error="Choose a country." required><UiAutocomplete :options="options" /></UiField>
        <UiField label="Loading"><UiAutocomplete :options="[]" model-value="Ger" loading /></UiField>
        <UiField label="Readonly"><UiAutocomplete :options="options" model-value="Italy" readonly /></UiField>
        <UiField label="Disabled"><UiAutocomplete :options="options" model-value="Spain" disabled /></UiField>
        <UiField label="Small"><UiAutocomplete :options="options" size="sm" placeholder="Dense row" /></UiField>
      </form>
    `,
	}),
};
