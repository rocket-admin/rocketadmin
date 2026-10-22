import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, onMounted, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { vTooltip } from '../tooltip';
import UiAccordion from '../UiAccordion.vue';
import UiAlert from '../UiAlert.vue';
import UiAutocomplete from '../UiAutocomplete.vue';
import UiBadge from '../UiBadge.vue';
import UiButton from '../UiButton.vue';
import UiCard from '../UiCard.vue';
import UiCheckbox from '../UiCheckbox.vue';
import UiChip from '../UiChip.vue';
import UiConfirmDialog from '../UiConfirmDialog.vue';
import UiDivider from '../UiDivider.vue';
import UiDrawer from '../UiDrawer.vue';
import UiExpansionPanel from '../UiExpansionPanel.vue';
import UiField from '../UiField.vue';
import UiIcon from '../UiIcon.vue';
import UiIconButton from '../UiIconButton.vue';
import UiInput from '../UiInput.vue';
import UiList from '../UiList.vue';
import UiListItem from '../UiListItem.vue';
import UiMenu from '../UiMenu.vue';
import UiMenuItem from '../UiMenuItem.vue';
import UiModal from '../UiModal.vue';
import UiPageShell from '../UiPageShell.vue';
import UiPaginator from '../UiPaginator.vue';
import UiProgressBar from '../UiProgressBar.vue';
import UiRadio from '../UiRadio.vue';
import UiRadioGroup from '../UiRadioGroup.vue';
import UiSegmented from '../UiSegmented.vue';
import UiSelect from '../UiSelect.vue';
import UiSkeleton from '../UiSkeleton.vue';
import UiSpinner from '../UiSpinner.vue';
import UiSwitch from '../UiSwitch.vue';
import UiTab from '../UiTab.vue';
import UiTable from '../UiTable.vue';
import UiTabPanel from '../UiTabPanel.vue';
import UiTabs from '../UiTabs.vue';
import UiTextarea from '../UiTextarea.vue';
import { axeViolations, formatViolations } from './axe';

/**
 * The repo's automated accessibility gate: axe-core over every primitive, in every state whose
 * ARIA shape differs.
 *
 * This exists because nothing else in the repo enforces accessibility. Biome does not parse Vue
 * `<template>`, so its a11y rules (`useSemanticElements`, `useAriaPropsForRole`, `useButtonType`)
 * never see a single line of markup — Phase 6 established that. Storybook's a11y addon reports in
 * a panel a human has to open. Until this file, an ARIA regression in a primitive could ship, and
 * a primitive's defect multiplies across every view that consumes it.
 *
 * See `./axe.ts` for what jsdom can and cannot check, and why the gate lives here rather than in a
 * browser-mode story runner.
 *
 * These assert the ARIA *tree*, not appearance, so they are not change-detectors: restyling a
 * primitive cannot fail them, and changing its roles or labelling should.
 */

/** Fails with the rule id and offending selector rather than a bare `expected 1 to be 0`. */
async function expectNoViolations(
	component: Parameters<typeof axeViolations>[0],
	options: Parameters<typeof axeViolations>[1] = {},
) {
	const violations = await axeViolations(component, options);
	expect(formatViolations(violations), formatViolations(violations)).toBe('');
}

describe('primitive accessibility', () => {
	// jsdom has no showModal(), and axe skips a closed <dialog>'s content entirely, so without this
	// stub every open-dialog audit (UiModal, UiConfirmDialog, UiDrawer) would pass vacuously. The stub only flips `open`, which is what un-hides it.
	beforeEach(() => {
		(HTMLDialogElement.prototype as unknown as { showModal: () => void }).showModal = function (
			this: HTMLDialogElement,
		) {
			this.open = true;
		};
	});
	afterEach(() => {
		delete (HTMLDialogElement.prototype as unknown as { showModal?: () => void }).showModal;
	});

	// Guards the harness itself. Every assertion below is an assertion that axe found NOTHING, which
	// is also what a silently broken harness returns — a detached mount, a bad selector, a version
	// bump that changes `axe.run`'s shape. This is the one case that must come back non-empty.
	it('detects a real violation (harness self-test)', async () => {
		const Broken = defineComponent({
			// An input whose only "label" is a sibling text node: unlabelled to AT, which is exactly the
			// defect UiField was built to prevent.
			template: '<div><span>Email</span><input type="email" /></div>',
		});

		const violations = await axeViolations(Broken);

		expect(violations.map((violation) => violation.id)).toContain('label');
	});

	describe('UiButton', () => {
		it('is accessible as a button', async () => {
			await expectNoViolations(UiButton, { slots: { default: () => 'Save' } });
		});

		it('is accessible when loading', async () => {
			// aria-busy + a spinner that must stay aria-hidden, or the button announces twice.
			await expectNoViolations(UiButton, {
				props: { loading: true },
				slots: { default: () => 'Saving' },
			});
		});

		it('is accessible when disabled', async () => {
			await expectNoViolations(UiButton, {
				props: { disabled: true },
				slots: { default: () => 'Save' },
			});
		});

		it('is accessible as a link', async () => {
			await expectNoViolations(UiButton, {
				props: { href: 'https://example.com' },
				slots: { default: () => 'Docs' },
			});
		});

		it('is accessible as a disabled link', async () => {
			// aria-disabled with no href — the shape that keeps a "disabled" anchor off the tab order.
			await expectNoViolations(UiButton, {
				props: { href: 'https://example.com', disabled: true },
				slots: { default: () => 'Docs' },
			});
		});
	});

	describe('UiField + UiInput', () => {
		it('is accessible with a label alone', async () => {
			await expectNoViolations(UiField, {
				props: { label: 'Email' },
				slots: { default: () => h(UiInput, { type: 'email' }) },
			});
		});

		it('is accessible with hint and error', async () => {
			// The describedby wiring: two ids on one control, both of which must resolve.
			await expectNoViolations(UiField, {
				props: { label: 'Email', hint: 'Work address', error: 'Enter a valid email' },
				slots: { default: () => h(UiInput, { type: 'email' }) },
			});
		});

		it('is accessible with two fields on one page', async () => {
			// duplicate-id-aria: the useId guard, from axe's side rather than the spec's.
			const Host = defineComponent({
				components: { UiField, UiInput },
				template: `
          <form>
            <UiField label="Email" error="Bad"><UiInput /></UiField>
            <UiField label="Password" hint="12+ characters"><UiInput type="password" /></UiField>
          </form>
        `,
			});

			await expectNoViolations(Host);
		});
	});

	describe('UiField + UiTextarea', () => {
		it('is accessible with hint and error', async () => {
			await expectNoViolations(UiField, {
				props: { label: 'Description', hint: 'Markdown allowed', error: 'Too long', required: true },
				slots: { default: () => h(UiTextarea, { rows: 3 }) },
			});
		});
	});

	describe('UiSelect', () => {
		const options = [
			{ value: true, label: 'Yes' },
			{ value: 42, label: 'Forty-two' },
			{ value: null, label: 'Null', disabled: true },
		];

		it('is accessible inside a UiField with an error', async () => {
			await expectNoViolations(UiField, {
				props: { label: 'Plan', error: 'Pick a plan', required: true },
				slots: { default: () => h(UiSelect, { options, placeholder: 'Choose…' }) },
			});
		});

		it('is accessible as a multiple list box', async () => {
			await expectNoViolations(UiField, {
				props: { label: 'Roles' },
				slots: { default: () => h(UiSelect, { options, multiple: true, modelValue: [true] }) },
			});
		});

		it('is accessible disabled, labelled standalone', async () => {
			await expectNoViolations(UiSelect, { props: { options, disabled: true }, attrs: { 'aria-label': 'Operator' } });
		});
	});

	describe('UiCheckbox', () => {
		for (const [state, props] of [
			['unchecked', {}],
			['checked', { modelValue: true }],
			['indeterminate', { indeterminate: true }],
			['disabled', { disabled: true, modelValue: true }],
		] as const) {
			it(`is accessible ${state}`, async () => {
				await expectNoViolations(UiCheckbox, { props, slots: { default: () => 'Select all rows' } });
			});
		}

		it('is accessible with no visible text and an aria-label', async () => {
			// The table-row shape: no slot text, so the name has to come from the attr on the input.
			await expectNoViolations(UiCheckbox, { attrs: { 'aria-label': 'Select row 1' } });
		});
	});

	describe('UiSegmented', () => {
		const options = [
			{ value: true, label: 'Yes' },
			{ value: false, label: 'No' },
			{ value: null, label: 'Null' },
		];

		it('is accessible with a choice made', async () => {
			// radiogroup naming via `label`, and native radios each named by their segment text.
			await expectNoViolations(UiSegmented, { props: { options, label: 'Active', modelValue: true } });
		});

		it('is accessible with nothing chosen and one option disabled', async () => {
			await expectNoViolations(UiSegmented, {
				props: { options: [...options.slice(0, 2), { value: null, label: 'Null', disabled: true }], label: 'Active' },
			});
		});

		it('is accessible disabled', async () => {
			await expectNoViolations(UiSegmented, { props: { options, label: 'Active', disabled: true } });
		});
	});

	describe('UiAutocomplete', () => {
		const options = [
			{ value: 'de', label: 'Germany' },
			{ value: 'fr', label: 'France', disabled: true },
			{ value: 'it', label: 'Italy' },
		];
		/** Mounts inside a UiField and, when `open`, focuses and presses ArrowDown before axe runs. */
		const Host = (props: Record<string, unknown>, open: boolean) =>
			defineComponent({
				components: { UiField, UiAutocomplete },
				setup() {
					const root = ref<HTMLElement | null>(null);
					onMounted(() => {
						if (!open) return;
						const input = root.value?.querySelector('input');
						input?.dispatchEvent(new Event('focus'));
						input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
					});
					return { root, props };
				},
				template: `
          <div ref="root">
            <UiField label="Country" hint="Start typing">
              <UiAutocomplete v-bind="props" />
            </UiField>
          </div>
        `,
			});

		it('is accessible when closed', async () => {
			// aria-controls must still resolve while closed, which is why the listbox is v-show.
			await expectNoViolations(Host({ options }, false));
		});

		it('is accessible when open with an active option', async () => {
			// aria-activedescendant must name a rendered role="option" inside the controlled listbox.
			await expectNoViolations(Host({ options, modelValue: 'G' }, true));
		});

		it('is accessible when open showing emptyText', async () => {
			await expectNoViolations(Host({ options: [], modelValue: 'zz', emptyText: 'No matches' }, true));
		});

		it('is accessible while loading', async () => {
			await expectNoViolations(Host({ options: [], modelValue: 'zz', loading: true }, false));
		});

		it('is accessible disabled', async () => {
			await expectNoViolations(Host({ options, disabled: true }, false));
		});
	});

	describe('UiSelect option groups', () => {
		it('is accessible with optgroups', async () => {
			await expectNoViolations(UiField, {
				props: { label: 'Action' },
				slots: {
					default: () =>
						h(UiSelect, {
							options: [
								{ value: 'none', label: 'None' },
								{ value: 'read', label: 'Read', group: 'Table' },
								{ value: 'manage', label: 'Manage', group: 'Connection' },
							],
						}),
				},
			});
		});
	});

	describe('UiSwitch', () => {
		for (const [state, props] of [
			['off', {}],
			['on', { modelValue: true }],
			['disabled', { disabled: true, modelValue: true }],
		] as const) {
			it(`is accessible ${state}`, async () => {
				// role="switch" on a native checkbox: aria-allowed-role must accept it, and the label names it.
				await expectNoViolations(UiSwitch, { props: { ...props, label: 'Show only my connections' } });
			});
		}

		it('is accessible inside a UiField with a hint', async () => {
			await expectNoViolations(UiField, {
				props: { label: 'Notifications', hint: 'Sent by email' },
				slots: { default: () => h(UiSwitch, { label: 'Enabled' }) },
			});
		});
	});

	describe('UiRadioGroup + UiRadio', () => {
		const options = [
			{ value: 'none', label: 'No access' },
			{ value: 'readonly', label: 'Read only' },
			{ value: 'edit', label: 'Full access', disabled: true },
		];

		it('is accessible labelled by its own caption, with a choice made', async () => {
			await expectNoViolations(UiRadioGroup, { props: { options, label: 'Table access', modelValue: 'readonly' } });
		});

		it('is accessible disabled with nothing chosen', async () => {
			await expectNoViolations(UiRadioGroup, { props: { options, label: 'Table access', disabled: true } });
		});

		it('is accessible inside a UiField with hint and error', async () => {
			// aria-labelledby → the field label, aria-describedby → hint + error, aria-invalid on a radiogroup.
			await expectNoViolations(UiField, {
				props: { label: 'Table access', hint: 'Applies to every table', error: 'Choose one', required: true },
				slots: { default: () => h(UiRadioGroup, { options }) },
			});
		});

		it('is accessible with slotted radios', async () => {
			const Host = defineComponent({
				components: { UiRadioGroup, UiRadio },
				template: `
          <UiRadioGroup label="Direction" orientation="horizontal" :model-value="true">
            <UiRadio :value="true">Ascending</UiRadio>
            <UiRadio :value="false">Descending</UiRadio>
          </UiRadioGroup>
        `,
			});

			await expectNoViolations(Host);
		});
	});

	describe('UiExpansionPanel', () => {
		it('is accessible collapsed', async () => {
			// aria-controls must still resolve while collapsed, which is why the region is v-show.
			await expectNoViolations(UiExpansionPanel, {
				props: { title: 'Advanced settings' },
				slots: { default: () => 'Body' },
			});
		});

		it('is accessible expanded with header actions', async () => {
			await expectNoViolations(UiExpansionPanel, {
				props: { title: 'orders', description: '3 records', open: true, headingLevel: 3 },
				slots: {
					default: () => 'Body',
					actions: () => h(UiIconButton, { icon: 'add', label: 'Add a new record to orders' }),
				},
			});
		});

		it('is accessible disabled without a chevron', async () => {
			await expectNoViolations(UiExpansionPanel, {
				props: { title: 'orders', description: 'Empty', disabled: true, hideToggle: true },
				slots: { default: () => 'Body' },
			});
		});

		it('is accessible as an accordion', async () => {
			const Host = defineComponent({
				components: { UiAccordion, UiExpansionPanel },
				template: `
          <UiAccordion>
            <UiExpansionPanel title="General" :open="true">General</UiExpansionPanel>
            <UiExpansionPanel title="Security">Security</UiExpansionPanel>
          </UiAccordion>
        `,
			});

			await expectNoViolations(Host);
		});
	});

	describe('UiTable', () => {
		const columns = [
			{ key: 'name', label: 'Name', sortable: true },
			{ key: 'age', label: 'Age', sortable: true, align: 'end' as const },
			{ key: 'city', label: 'City' },
		];
		const rows = [
			{ id: 1, name: 'Ann', age: 30, city: 'Oslo' },
			{ id: 2, name: 'Bob', age: 4, city: 'Rome' },
		];

		it('is accessible plain', async () => {
			await expectNoViolations(UiTable, { props: { columns, rows, rowKey: 'id', label: 'Users' } });
		});

		it('is accessible sorted, selectable, partly selected, with actions', async () => {
			// aria-sort on the <th>, named row checkboxes, an indeterminate header box, buttons in a sticky cell.
			await expectNoViolations(UiTable, {
				props: {
					columns,
					rows,
					rowKey: 'id',
					label: 'Users',
					selectable: true,
					selected: [2],
					sort: { active: 'age', direction: 'desc' },
					stickyHeader: true,
				},
				slots: {
					actions: ({ row }: { row: { id: number } }) =>
						h(UiIconButton, { icon: 'delete', label: `Delete row ${row.id}` }),
				},
			});
		});

		it('is accessible loading', async () => {
			await expectNoViolations(UiTable, { props: { columns, rows: [], rowKey: 'id', label: 'Users', loading: true } });
		});

		it('is accessible empty', async () => {
			await expectNoViolations(UiTable, {
				props: { columns, rows: [], rowKey: 'id', label: 'Users', selectable: true, emptyText: 'No data' },
			});
		});
	});

	describe('UiPaginator', () => {
		it('is accessible with the size picker and first/last buttons', async () => {
			// The size <select> is named by the visible "Items per page:" text through aria-labelledby.
			await expectNoViolations(UiPaginator, {
				props: { length: 120, pageIndex: 1, pageSize: 30, pageSizeOptions: [10, 30, 100], showFirstLast: true },
			});
		});

		it('is accessible empty and disabled', async () => {
			await expectNoViolations(UiPaginator, { props: { length: 0, pageSize: 30, disabled: true } });
		});
	});

	describe('UiDivider', () => {
		it('is accessible horizontal and vertical', async () => {
			await expectNoViolations(UiDivider);
			await expectNoViolations(UiDivider, { props: { vertical: true } });
		});
	});

	describe('UiList + UiListItem', () => {
		const router = () =>
			createRouter({
				history: createMemoryHistory(),
				routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }],
			});

		it('is accessible as a navigation list of links', async () => {
			const Host = defineComponent({
				components: { UiList, UiListItem, UiIcon },
				template: `
          <UiList as="nav" label="Connection">
            <UiListItem to="/dashboard"><template #leading><UiIcon name="table" /></template>Tables</UiListItem>
            <UiListItem href="https://docs.rocketadmin.com/" target="_blank">Help center</UiListItem>
            <UiListItem href="/x" disabled>Disabled</UiListItem>
          </UiList>
        `,
			});

			await expectNoViolations(Host, { global: { plugins: [router()] } });
		});

		it('is accessible as a list of buttons and static rows', async () => {
			const Host = defineComponent({
				components: { UiList, UiListItem },
				template: `
          <UiList label="Related records">
            <UiListItem interactive active>Order 1<template #description>shipped</template></UiListItem>
            <UiListItem interactive disabled>Order 2</UiListItem>
            <UiListItem>Static</UiListItem>
          </UiList>
        `,
			});

			await expectNoViolations(Host);
		});
	});

	describe('vTooltip', () => {
		it('is accessible on a described icon button, hidden and shown', async () => {
			// aria-describedby must resolve to the describer node, and the shown bubble must be
			// aria-hidden so the text is not announced twice.
			const Host = defineComponent({
				components: { UiIconButton },
				directives: { tooltip: vTooltip },
				setup() {
					const root = ref<HTMLElement | null>(null);
					onMounted(async () => {
						await nextTick();
						root.value?.querySelector('button')?.dispatchEvent(new Event('focusin'));
					});
					return { root };
				},
				template: `
          <div ref="root">
            <UiIconButton v-tooltip="'Opens the row in a side panel'" icon="visibility" label="View row" />
          </div>
        `,
			});

			await expectNoViolations(Host);
		});
	});

	describe('UiAlert', () => {
		for (const tone of ['error', 'success', 'info', 'warning'] as const) {
			it(`is accessible with tone ${tone}`, async () => {
				await expectNoViolations(UiAlert, {
					props: { tone },
					slots: { default: () => 'Could not save your changes.' },
				});
			});
		}

		it('is accessible when not live', async () => {
			await expectNoViolations(UiAlert, {
				props: { live: false },
				slots: { default: () => 'Static notice.' },
			});
		});
	});

	describe('UiProgressBar', () => {
		it('is accessible', async () => {
			// role="progressbar" needs aria-valuenow/min/max and a name; before this primitive the usage
			// meter had none of them.
			await expectNoViolations(UiProgressBar, { props: { value: 40, label: 'Storage used' } });
		});

		it('is accessible at its bounds', async () => {
			await expectNoViolations(UiProgressBar, { props: { value: 0, label: 'Storage used' } });
			await expectNoViolations(UiProgressBar, {
				props: { value: 100, max: 100, label: 'Storage used' },
			});
		});
	});

	describe('UiSkeleton', () => {
		it('is accessible unlabelled', async () => {
			await expectNoViolations(UiSkeleton);
		});

		it('is accessible labelled, with multiple lines', async () => {
			await expectNoViolations(UiSkeleton, { props: { lines: 3, label: 'Loading websites' } });
		});

		it('is accessible as a block', async () => {
			await expectNoViolations(UiSkeleton, { props: { shape: 'block', height: '3rem' } });
		});

		it('is accessible as decorative bars inside one labelled region', async () => {
			// The composite-placeholder shape: one status region, every bar aria-hidden inside it.
			const Host = defineComponent({
				components: { UiSkeleton },
				template: `
          <div role="status" aria-label="Loading table">
            <UiSkeleton decorative shape="circle" width="2rem" height="2rem" />
            <UiSkeleton decorative shape="control" height="2.75rem" />
          </div>
        `,
			});

			await expectNoViolations(Host);
		});
	});

	describe('UiSpinner', () => {
		it('is accessible unlabelled', async () => {
			// aria-hidden: inside a button the button's own text is the name.
			await expectNoViolations(UiSpinner);
		});

		it('is accessible labelled', async () => {
			await expectNoViolations(UiSpinner, { props: { label: 'Loading' } });
		});
	});

	describe('UiChip', () => {
		for (const tone of ['neutral', 'accent', 'success', 'warning', 'danger'] as const) {
			it(`is accessible with tone ${tone}`, async () => {
				await expectNoViolations(UiChip, {
					props: { tone },
					slots: { default: () => 'Published' },
				});
			});
		}
	});

	describe('UiModal', () => {
		it('is accessible when open', async () => {
			// aria-labelledby must point at the rendered title node.
			await expectNoViolations(UiModal, {
				props: { open: true, title: 'Rename website' },
				slots: { default: () => 'Body copy.' },
			});
		});

		it('is accessible when non-dismissible', async () => {
			await expectNoViolations(UiModal, {
				props: { open: true, title: 'Confirm', dismissible: false },
				slots: { default: () => 'Body copy.' },
			});
		});
	});

	describe('UiConfirmDialog', () => {
		it('is accessible when open', async () => {
			await expectNoViolations(UiConfirmDialog, {
				props: { open: true, title: 'Delete website', message: 'This cannot be undone.' },
			});
		});

		it('is accessible while busy', async () => {
			await expectNoViolations(UiConfirmDialog, {
				props: {
					open: true,
					title: 'Delete website',
					message: 'This cannot be undone.',
					busy: true,
				},
			});
		});

		it('is accessible with an opt-in control in the default slot', async () => {
			// The slot puts a caller's own form control inside the dialog — a labelling mistake there
			// (a bare checkbox, or one labelled only by an adjacent text node) is exactly what axe
			// catches and what the harness self-test above proves it catches.
			await expectNoViolations(UiConfirmDialog, {
				props: { open: true, title: 'Delete website', message: 'This cannot be undone.' },
				slots: {
					default: '<label><input type="checkbox" /> Also delete the database</label>',
				},
			});
		});
	});

	describe('UiTabs', () => {
		it('is accessible as a complete tab tree', async () => {
			// The reason this primitive exists: WebsiteDetailView shipped role="tablist" wrapping plain
			// buttons — no role="tab", no aria-selected, no tabpanel. Screenreaders announced a tab list
			// with zero tabs. axe's aria-required-children/parent catch exactly that regression.
			const Host = defineComponent({
				components: { UiTabs, UiTab, UiTabPanel },
				template: `
          <UiTabs model-value="overview" label="Website sections">
            <template #tabs>
              <UiTab value="overview">Overview</UiTab>
              <UiTab value="pages">Pages</UiTab>
              <UiTab value="settings" disabled>Settings</UiTab>
            </template>
            <UiTabPanel value="overview">Overview content</UiTabPanel>
            <UiTabPanel value="pages">Pages content</UiTabPanel>
          </UiTabs>
        `,
			});

			await expectNoViolations(Host);
		});
	});

	describe('UiIcon', () => {
		it('is accessible as a decorative icon', async () => {
			await expectNoViolations(UiIcon, { props: { name: 'chevron_right' } });
		});

		it('is accessible as a meaningful icon', async () => {
			// role="img" requires a name; `label` is what supplies it.
			await expectNoViolations(UiIcon, { props: { name: 'warning', label: 'Warning' } });
		});
	});

	describe('UiIconButton', () => {
		it('is accessible as a button', async () => {
			// button-name: the icon is aria-hidden, so the label is the only name it has.
			await expectNoViolations(UiIconButton, { props: { icon: 'menu', label: 'Open navigation' } });
		});

		it('is accessible with a badge', async () => {
			await expectNoViolations(UiIconButton, {
				props: { icon: 'account_circle', label: 'Account', badge: 1, badgeLabel: 'email not verified' },
			});
		});

		it('is accessible as a link', async () => {
			await expectNoViolations(UiIconButton, {
				props: { icon: 'help', label: 'Help center', href: 'https://docs.rocketadmin.com/', target: '_blank' },
			});
		});

		it('is accessible as a disabled link', async () => {
			await expectNoViolations(UiIconButton, {
				props: { icon: 'help', label: 'Help center', href: 'https://docs.rocketadmin.com/', disabled: true },
			});
		});
	});

	describe('UiBadge', () => {
		it('is accessible over a labelled icon', async () => {
			await expectNoViolations(UiBadge, {
				props: { content: 1, label: 'Email not verified' },
				slots: { default: () => h(UiIcon, { name: 'face' }) },
			});
		});

		it('is accessible as an inline dot', async () => {
			await expectNoViolations(UiBadge);
		});
	});

	describe('UiMenu', () => {
		const router = () =>
			createRouter({
				history: createMemoryHistory(),
				routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }],
			});
		const Host = (open: boolean) =>
			defineComponent({
				components: { UiMenu, UiMenuItem, UiIconButton },
				setup: () => ({ open }),
				template: `
          <UiMenu :open="open">
            <template #trigger="{ triggerProps }">
              <UiIconButton icon="account_circle" label="Account" v-bind="triggerProps" />
            </template>
            <UiMenuItem to="/user-settings" icon="face" description="user@example.com">Account</UiMenuItem>
            <UiMenuItem href="https://docs.rocketadmin.com/" target="_blank" icon="help">Help center</UiMenuItem>
            <UiMenuItem disabled icon="archive">Archive</UiMenuItem>
            <UiMenuItem icon="logout">Log out</UiMenuItem>
          </UiMenu>
        `,
			});

		it('is accessible when closed', async () => {
			// aria-controls must still resolve while closed, which is why the panel is v-show, not v-if.
			await expectNoViolations(Host(false), { global: { plugins: [router()] } });
		});

		it('is accessible when open', async () => {
			// aria-required-children / -parent: every item must be a menuitem directly in the menu.
			await expectNoViolations(Host(true), { global: { plugins: [router()] } });
		});
	});

	describe('UiDrawer', () => {
		it('is accessible when open', async () => {
			await expectNoViolations(UiDrawer, {
				props: { open: true, label: 'Main navigation' },
				slots: {
					header: () => 'Rocketadmin',
					default: () => h('nav', { 'aria-label': 'Primary' }, [h('a', { href: '/connections' }, 'Connections')]),
				},
			});
		});
	});

	describe('layout primitives', () => {
		it('UiCard is accessible', async () => {
			await expectNoViolations(UiCard, { slots: { default: () => h('p', 'Card body') } });
		});

		it('UiCard is accessible as a section', async () => {
			await expectNoViolations(UiCard, {
				props: { as: 'section' },
				slots: { default: () => [h('h2', 'Plan'), h('p', 'Card body')] },
			});
		});

		it('UiPageShell is accessible', async () => {
			await expectNoViolations(UiPageShell, {
				props: { as: 'main' },
				slots: { default: () => [h('h1', 'Websites'), h('p', 'Body')] },
			});
		});
	});
});
