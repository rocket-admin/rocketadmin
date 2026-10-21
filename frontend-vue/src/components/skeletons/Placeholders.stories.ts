import type { Meta, StoryObj } from '@storybook/vue3-vite';
import PlaceholderAddUserDialog from './PlaceholderAddUserDialog.vue';
import PlaceholderApiKeysList from './PlaceholderApiKeysList.vue';
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
 * The 17 skeleton screens ported from `frontend/src/app/components/skeletons`, built on UiSkeleton.
 * One story each, for side-by-side comparison with the Angular Storybook. (PlaceholderAuditLog is
 * PlaceholderTableData under another label, so it has no story of its own.) Resize below 600px for
 * the table's card layout.
 */
const meta = {
	title: 'App/Skeletons',
	component: PlaceholderTableData,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
} satisfies Meta<typeof PlaceholderTableData>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (component: object, wrapperStyle = ''): Story => ({
	render: () => ({
		components: { Placeholder: component },
		template: `<div style="${wrapperStyle}"><Placeholder /></div>`,
	}),
});

export const TableData: Story = {};
export const TableView = story(PlaceholderTableView, 'height: 32rem;');
export const AddUserDialog = story(PlaceholderAddUserDialog, 'max-width: 30rem;');
export const ApiKeysList = story(PlaceholderApiKeysList, 'max-width: 40rem;');
export const Company = story(PlaceholderCompany);
export const CompanyInvitation = story(PlaceholderCompanyInvitation, 'height: 32rem;');
export const ConnectionSettings = story(PlaceholderConnectionSettings, 'max-width: 44rem; margin: 0 auto;');
export const Connections = story(PlaceholderConnections, 'max-width: 60rem; margin: 0 auto;');
export const Dashboards = story(PlaceholderDashboards);
export const RecordView = story(PlaceholderRecordView, 'max-width: 26rem;');
export const RowEdit = story(PlaceholderRowEdit);
export const SavedFilters = story(PlaceholderSavedFilters);
export const TableSettings = story(PlaceholderTableSettings);
export const TableWidgets = story(PlaceholderTableWidgets);
export const UserGroup = story(PlaceholderUserGroup, 'max-width: 30rem;');
export const UserGroups = story(PlaceholderUserGroups, 'max-width: 44rem;');

/** All of them stacked — the matrix for spotting radius or rhythm drift between screens. */
export const AllVariants: Story = {
	render: () => ({
		components: {
			PlaceholderSavedFilters,
			PlaceholderApiKeysList,
			PlaceholderUserGroups,
			PlaceholderUserGroup,
			PlaceholderRecordView,
			PlaceholderConnections,
			PlaceholderDashboards,
			PlaceholderTableData,
		},
		template: `
      <div style="display: grid; gap: 2.5rem;">
        <PlaceholderSavedFilters />
        <PlaceholderApiKeysList />
        <PlaceholderUserGroups />
        <PlaceholderUserGroup />
        <PlaceholderRecordView />
        <PlaceholderConnections />
        <PlaceholderDashboards />
        <PlaceholderTableData />
      </div>
    `,
	}),
};
