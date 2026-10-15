<script setup lang="ts">
import { environment } from '@/environment';
</script>

<template>
	<v-container>
		<h1 class="text-h5">Rocketadmin</h1>
		<p>Vue frontend scaffold, version {{ environment.version }}{{ environment.saas ? ' (SaaS)' : '' }}.</p>
	</v-container>
</template>
