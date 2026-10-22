import type { Meta, StoryObj } from '@storybook/vue3-vite';
import UiIcon from './UiIcon.vue';
import UiList from './UiList.vue';
import UiListItem from './UiListItem.vue';

/**
 * `mat-list` / `mat-nav-list`: a real `<ul>` of `UiListItem`s. Items are RouterLinks (`to`), links
 * (`href`), buttons (`interactive`) or static rows, with `leading` / `description` / `trailing`
 * slots. `as="nav"` adds a named `<nav>` landmark.
 */
const meta = {
	title: 'UI/List',
	component: UiList,
	subcomponents: { UiListItem },
	tags: ['autodocs'],
	args: { as: 'ul', size: 'md' },
	argTypes: {
		as: { control: 'inline-radio', options: ['ul', 'nav'] },
		size: { control: 'inline-radio', options: ['sm', 'md'] },
	},
	render: (args) => ({
		components: { UiList, UiListItem, UiIcon },
		setup: () => ({ args }),
		template: `
      <UiList v-bind="args" label="Related records" style="max-width: 24rem;">
        <UiListItem interactive>
          Order #1001
          <template #description>status: shipped; total: 120.00;</template>
        </UiListItem>
        <UiListItem interactive active>
          Order #1002
          <template #description>status: pending; total: 18.50;</template>
        </UiListItem>
        <UiListItem>Static row</UiListItem>
      </UiList>
    `,
	}),
} satisfies Meta<typeof UiList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every item kind, with leading and trailing adornments, at both sizes. */
export const AllVariants: Story = {
	render: () => ({
		components: { UiList, UiListItem, UiIcon },
		setup: () => ({ sizes: ['sm', 'md'] as const }),
		template: `
      <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
        <UiList v-for="size in sizes" :key="size" :size="size" as="nav" :label="size + ' navigation'" style="width: 18rem;">
          <UiListItem href="#" active><template #leading><UiIcon name="dns" /></template>Connections</UiListItem>
          <UiListItem href="https://docs.rocketadmin.com/" target="_blank"><template #leading><UiIcon name="help" /></template>Help center</UiListItem>
          <UiListItem interactive><template #leading><UiIcon name="folder" /></template>Orders<template #trailing>12</template></UiListItem>
          <UiListItem interactive disabled><template #leading><UiIcon name="lock" /></template>Disabled</UiListItem>
          <UiListItem>Static</UiListItem>
        </UiList>
      </div>
    `,
	}),
};
