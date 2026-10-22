import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import UiPaginator from './UiPaginator.vue';

/**
 * `mat-paginator` with Material's texts: "Items per page:", "1 – 30 of 120", previous/next and
 * optional first/last. Emits `update:pageIndex`, `update:pageSize` and a `page` event; the caller
 * fetches.
 */
const meta = {
	title: 'UI/Paginator',
	component: UiPaginator,
	tags: ['autodocs'],
	args: { length: 120, pageSizeOptions: [10, 30, 100, 300], showFirstLast: true, disabled: false },
	render: (args) => ({
		components: { UiPaginator },
		setup: () => ({ args, pageIndex: ref(0), pageSize: ref(30) }),
		template: `
      <div style="display: grid; gap: 0.5rem;">
        <UiPaginator v-bind="args" v-model:page-index="pageIndex" v-model:page-size="pageSize" />
        <code>pageIndex {{ pageIndex }} · pageSize {{ pageSize }}</code>
      </div>
    `,
	}),
} satisfies Meta<typeof UiPaginator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The large-dataset shape: no first/last. */
export const WithoutFirstLast: Story = { args: { showFirstLast: false } };

/** First page / middle / last page / empty / no size picker / disabled. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiPaginator },
		setup: () => ({ sizes: [10, 30, 100, 300] }),
		template: `
      <div style="display: grid; gap: 0.5rem;">
        <UiPaginator :length="120" :page-index="0" :page-size="30" :page-size-options="sizes" show-first-last />
        <UiPaginator :length="120" :page-index="2" :page-size="30" :page-size-options="sizes" show-first-last />
        <UiPaginator :length="120" :page-index="3" :page-size="30" :page-size-options="sizes" show-first-last />
        <UiPaginator :length="0" :page-size="30" :page-size-options="sizes" />
        <UiPaginator :length="45" :page-index="1" :page-size="20" />
        <UiPaginator :length="120" :page-index="1" :page-size="30" :page-size-options="sizes" show-first-last disabled />
      </div>
    `,
	}),
};
