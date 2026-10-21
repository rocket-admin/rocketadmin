import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import AppCodeEditor from './AppCodeEditor.vue';

/**
 * Monaco, loaded in its own chunk on mount. Until it arrives a plain `<textarea>` with the same
 * value stands in. The theme follows the dark-mode preference.
 */
const meta = {
	title: 'App/CodeEditor',
	component: AppCodeEditor,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: { label: 'JSON value', language: 'json', readonly: false, height: '200px' },
	argTypes: {
		language: { control: 'select', options: ['json', 'sql', 'markdown', 'html', 'javascript', 'plaintext'] },
		options: { control: false },
	},
	render: (args) => ({
		components: { AppCodeEditor },
		setup: () => ({ args, value: ref('{\n  "id": 1,\n  "name": "Ada Lovelace",\n  "tags": ["admin"]\n}') }),
		template: `
      <div style="max-width: 36rem; display: grid; gap: 0.75rem;">
        <AppCodeEditor v-bind="args" v-model="value" />
        <pre style="margin: 0; font-size: 0.75rem;">{{ value }}</pre>
      </div>
    `,
	}),
} satisfies Meta<typeof AppCodeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Json: Story = {};

export const Sql: Story = {
	args: { label: 'Query', language: 'sql' },
	render: (args) => ({
		components: { AppCodeEditor },
		setup: () => ({ args, value: ref('SELECT id, email\nFROM users\nWHERE created_at > now() - interval 7 day;') }),
		template: '<div style="max-width: 36rem;"><AppCodeEditor v-bind="args" v-model="value" /></div>',
	}),
};

export const Readonly: Story = { args: { readonly: true } };
