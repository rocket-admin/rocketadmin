import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { PlaceholderAuditLogComponent } from './placeholder-audit-log.component';

const meta: Meta<PlaceholderAuditLogComponent> = {
	title: 'Skeletons/PlaceholderAuditLog',
	component: PlaceholderAuditLogComponent,
	decorators: [
		moduleMetadata({
			declarations: [PlaceholderAuditLogComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<PlaceholderAuditLogComponent>;

export const Default: Story = {};
