<script setup lang="ts">
// Port of frontend/src/app/components/user-deleted-success (/deleted), where the account deletion
// flow lands.
import AppBanner from '@/components/shared/AppBanner.vue';
import { UiButton } from '@/components/ui';
import { AlertType } from '@/models/alert';
</script>

<template>
	<AppBanner :type="AlertType.Success">
		<p>Your account has been deleted successfully.</p>
		<template #actions>
			<UiButton variant="secondary" href="https://rocketadmin.com/">Visit home page</UiButton>
		</template>
	</AppBanner>
</template>
