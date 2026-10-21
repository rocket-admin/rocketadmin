import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { Component } from 'vue';
import { axeViolations, formatViolations } from '@/components/ui/__tests__/axe';
import PlaceholderAddUserDialog from './PlaceholderAddUserDialog.vue';
import PlaceholderApiKeysList from './PlaceholderApiKeysList.vue';
import PlaceholderAuditLog from './PlaceholderAuditLog.vue';
import PlaceholderCompany from './PlaceholderCompany.vue';
import PlaceholderCompanyInvitation from './PlaceholderCompanyInvitation.vue';
import PlaceholderConnectionSettings from './PlaceholderConnectionSettings.vue';
import PlaceholderConnections from './PlaceholderConnections.vue';
import PlaceholderDashboards from './PlaceholderDashboards.vue';
import PlaceholderRecordView from './PlaceholderRecordView.vue';
import PlaceholderRowEdit from './PlaceholderRowEdit.vue';
import PlaceholderSavedFilters from './PlaceholderSavedFilters.vue';
import PlaceholderTableData from './PlaceholderTableData.vue';
import PlaceholderTableSettings from './PlaceholderTableSettings.vue';
import PlaceholderTableView from './PlaceholderTableView.vue';
import PlaceholderTableWidgets from './PlaceholderTableWidgets.vue';
import PlaceholderUserGroup from './PlaceholderUserGroup.vue';
import PlaceholderUserGroups from './PlaceholderUserGroups.vue';

/**
 * One spec for all 17 skeleton screens. Each asserts the contract that matters — the screen
 * announces once, and none of its bars do — plus the structure it fakes, counted in bars, so a
 * placeholder can't silently drift away from the page it stands in for. Appearance is Storybook's.
 */
const PLACEHOLDERS: Array<[string, Component, number]> = [
	['PlaceholderAddUserDialog', PlaceholderAddUserDialog, 5],
	['PlaceholderApiKeysList', PlaceholderApiKeysList, 9],
	['PlaceholderAuditLog', PlaceholderAuditLog, 42 + 6 * 4],
	['PlaceholderCompany', PlaceholderCompany, 6 + 42 + 6 * 4],
	['PlaceholderCompanyInvitation', PlaceholderCompanyInvitation, 6],
	['PlaceholderConnectionSettings', PlaceholderConnectionSettings, 8],
	['PlaceholderConnections', PlaceholderConnections, 4],
	['PlaceholderDashboards', PlaceholderDashboards, 6 * 5],
	['PlaceholderRecordView', PlaceholderRecordView, 2 + 5 * 2],
	['PlaceholderRowEdit', PlaceholderRowEdit, 3 + 5 + 3],
	['PlaceholderSavedFilters', PlaceholderSavedFilters, 4],
	['PlaceholderTableData', PlaceholderTableData, 42 + 6 * 4],
	['PlaceholderTableSettings', PlaceholderTableSettings, 3 + 1 + 2 + 10 * 2 + 3],
	['PlaceholderTableView', PlaceholderTableView, 6 + 42 + 6 * 4],
	['PlaceholderTableWidgets', PlaceholderTableWidgets, 3 + 2 * 6 + 2],
	['PlaceholderUserGroup', PlaceholderUserGroup, 3],
	['PlaceholderUserGroups', PlaceholderUserGroups, 3 * 2],
];

describe('skeleton placeholders', () => {
	it('covers all 17 Angular skeletons', () => {
		expect(PLACEHOLDERS).toHaveLength(17);
	});

	for (const [name, component, bars] of PLACEHOLDERS) {
		describe(name, () => {
			it('is one labelled status region', () => {
				const wrapper = mount(component);
				const regions = wrapper.findAll('[role="status"]');

				expect(regions).toHaveLength(1);
				expect(regions[0]?.attributes('aria-label')).toMatch(/^Loading/);
			});

			it(`fakes its page with ${bars} decorative bars`, () => {
				const wrapper = mount(component);

				expect(wrapper.findAll('.ui-skeleton__bar')).toHaveLength(bars);
				for (const skeleton of wrapper.findAll('.ui-skeleton')) {
					expect(skeleton.attributes('aria-hidden')).toBe('true');
					expect(skeleton.attributes('role')).toBeUndefined();
				}
			});

			it('passes axe', async () => {
				const violations = await axeViolations(component);
				expect(formatViolations(violations), formatViolations(violations)).toBe('');
			});
		});
	}

	it('PlaceholderTableData drops its own region when nested in another placeholder', () => {
		expect(mount(PlaceholderTableData, { props: { nested: true } }).findAll('[role="status"]')).toHaveLength(0);
	});

	it('PlaceholderTableData renders the table grid and the mobile cards', () => {
		const wrapper = mount(PlaceholderTableData);

		expect(wrapper.findAll('.ph__cell')).toHaveLength(42);
		expect(wrapper.findAll('.ph__card')).toHaveLength(6);
	});
});
