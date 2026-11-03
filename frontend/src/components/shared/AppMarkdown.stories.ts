import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppMarkdown from './AppMarkdown.vue';

/**
 * Rendered Markdown for the markdown view and display fields. The source is database content, so
 * the output is always sanitized — the _Sanitized_ story feeds it script and handler attributes.
 */
const meta = {
	title: 'App/Markdown',
	component: AppMarkdown,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	args: {
		source: [
			'## Release notes',
			'',
			'Some **bold**, some _italic_, `inline code` and a [link](https://docs.rocketadmin.com/).',
			'',
			'- First item',
			'- Second item',
			'',
			'| Column | Type |',
			'| --- | --- |',
			'| id | integer |',
			'| email | varchar |',
			'',
			'```sql',
			'SELECT * FROM users;',
			'```',
		].join('\n'),
		inline: false,
	},
} satisfies Meta<typeof AppMarkdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** One-line preview for a table cell: no block wrappers. */
export const Inline: Story = { args: { source: 'A **short** preview with `code`', inline: true } };

/** The script, the `onerror` handler and the `javascript:` URL are all stripped. */
export const Sanitized: Story = {
	args: {
		source:
			'Safe text <script>alert(1)</script><img src="x" alt="broken" onerror="alert(2)"> [click](javascript:alert(3))',
	},
};
