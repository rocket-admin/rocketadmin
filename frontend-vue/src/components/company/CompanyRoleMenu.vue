<script setup lang="ts">
// The role picker of the company page and the invite dialog: a button naming the current role that
// opens a menu of the three roles, each with its description and a check on the current one.
import { UiButton, UiIcon, UiMenu, UiMenuItem } from '@/components/ui';
import type { CompanyMemberRole } from '@/models/company';
import { COMPANY_ROLE_NAMES, COMPANY_ROLE_OPTIONS } from './companyRoles';

withDefaults(
	defineProps<{
		/** The current role. */
		role: CompanyMemberRole;
		/** Trigger emphasis: `ghost` in the table, `secondary` (outlined) in the dialog. */
		variant?: 'ghost' | 'secondary';
		/** Accessible name of the menu. */
		label?: string;
	}>(),
	{ variant: 'ghost', label: 'Role' },
);

const emit = defineEmits<{ select: [CompanyMemberRole]; open: [] }>();
</script>

<template>
	<UiMenu :label="label" class="company-role-menu">
		<template #trigger="{ triggerProps }">
			<UiButton
				v-bind="triggerProps"
				:variant="variant"
				block
				class="company-role-menu__trigger"
				@click="emit('open')"
			>
				{{ COMPANY_ROLE_NAMES[role] }}
				<template #trailing><UiIcon name="arrow_drop_down" size="sm" class="company-role-menu__caret" /></template>
			</UiButton>
		</template>
		<UiMenuItem
			v-for="option in COMPANY_ROLE_OPTIONS"
			:key="option.role"
			class="company-role-menu__option"
			@select="emit('select', option.role)"
		>
			<span class="company-role-menu__option-header">
				<strong>{{ COMPANY_ROLE_NAMES[option.role] }}</strong>
				<UiIcon v-if="option.role === role" name="check" size="sm" label="Current role" />
			</span>
			<span class="company-role-menu__description">
				{{ option.description[0] }}<br>{{ option.description[1] }}
			</span>
		</UiMenuItem>
	</UiMenu>
</template>

<style scoped>
.company-role-menu {
	display: flex;
	width: 100%;
}

.company-role-menu__trigger {
	justify-content: space-between;
}

.company-role-menu__caret {
	margin-inline-start: auto;
}

.company-role-menu__option-header {
	display: flex;
	align-items: center;
	gap: var(--space-1);
}

.company-role-menu__description {
	display: block;
	margin-top: var(--space-05);
	font-size: var(--text-xs);
	color: var(--color-muted);
}
</style>
