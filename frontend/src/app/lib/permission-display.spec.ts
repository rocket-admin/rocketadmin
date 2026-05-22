import { actionIcon, actionLabel, actionShortLabel, groupNameForAction } from './permission-display';

describe('permission-display', () => {
	describe('actionLabel', () => {
		it('formats simple verbs', () => {
			expect(actionLabel('connection:read')).toBe('Connection read');
			expect(actionLabel('connection:edit')).toBe('Connection edit');
			expect(actionLabel('table:add')).toBe('Table add');
			expect(actionLabel('table:delete')).toBe('Table delete');
		});

		it('preserves acronyms in hyphenated verbs', () => {
			expect(actionLabel('table:ai-request')).toBe('Table AI request');
		});

		it('formats camelCase prefixes', () => {
			expect(actionLabel('actionEvent:trigger')).toBe('Action event trigger');
		});

		it('formats wildcards', () => {
			expect(actionLabel('*')).toBe('Full access (all permissions)');
			expect(actionLabel('table:*')).toBe('Full table access');
			expect(actionLabel('dashboard:*')).toBe('Full dashboard access');
			expect(actionLabel('panel:*')).toBe('Full panel access');
		});
	});

	describe('actionShortLabel', () => {
		it('returns verb-only short labels', () => {
			expect(actionShortLabel('connection:read')).toBe('Read');
			expect(actionShortLabel('table:edit')).toBe('Edit');
			expect(actionShortLabel('actionEvent:trigger')).toBe('Trigger');
			expect(actionShortLabel('table:ai-request')).toBe('AI request');
		});

		it('returns "Full access" for wildcards', () => {
			expect(actionShortLabel('*')).toBe('Full access');
			expect(actionShortLabel('table:*')).toBe('Full access');
			expect(actionShortLabel('panel:*')).toBe('Full access');
		});
	});

	describe('groupNameForAction', () => {
		it('maps known prefixes', () => {
			expect(groupNameForAction('connection:read')).toBe('Connection');
			expect(groupNameForAction('group:edit')).toBe('Group');
			expect(groupNameForAction('table:read')).toBe('Table');
			expect(groupNameForAction('actionEvent:trigger')).toBe('ActionEvent');
			expect(groupNameForAction('dashboard:read')).toBe('Dashboard');
			expect(groupNameForAction('panel:read')).toBe('Panel');
		});

		it('falls back to capitalized prefix for unknown actions', () => {
			expect(groupNameForAction('foo:bar')).toBe('Foo');
		});
	});

	describe('actionIcon', () => {
		it('maps known verbs', () => {
			expect(actionIcon('connection:read')).toBe('visibility');
			expect(actionIcon('table:edit')).toBe('edit');
			expect(actionIcon('table:add')).toBe('add_circle');
			expect(actionIcon('dashboard:create')).toBe('add_circle');
			expect(actionIcon('table:delete')).toBe('delete');
			expect(actionIcon('actionEvent:trigger')).toBe('play_arrow');
			expect(actionIcon('connection:diagram')).toBe('schema');
			expect(actionIcon('table:ai-request')).toBe('auto_awesome');
		});

		it('returns shield for wildcards', () => {
			expect(actionIcon('*')).toBe('shield');
			expect(actionIcon('table:*')).toBe('shield');
			expect(actionIcon('dashboard:*')).toBe('shield');
		});

		it('falls back for unknown verbs', () => {
			expect(actionIcon('foo:bar')).toBe('help_outline');
		});
	});
});
