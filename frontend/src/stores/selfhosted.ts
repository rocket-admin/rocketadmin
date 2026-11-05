// Port of SelfhostedService: whether a self-hosted install still needs its first admin (/setup).
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api/client';
import { environment } from '@/environment';

export interface IsConfiguredResponse {
	isConfigured: boolean;
}

export interface CreateInitialUserRequest {
	email: string;
	password: string;
}

export interface CreateInitialUserResponse {
	success: boolean;
}

export const useSelfhostedStore = defineStore('selfhosted', () => {
	const isConfigured = ref<boolean | null>(null);
	const isCheckingConfiguration = ref(false);
	const isSelfHosted = computed(() => !environment.saas);

	async function checkConfiguration(): Promise<IsConfiguredResponse> {
		isCheckingConfiguration.value = true;
		try {
			const data = await api.get<IsConfiguredResponse>('/selfhosted/is-configured', { notify: false });
			isConfigured.value = data.isConfigured;
			return data;
		} catch (error) {
			console.error('Failed to check configuration:', error);
			// If the endpoint fails, assume configured so login is never blocked.
			isConfigured.value = true;
			return { isConfigured: true };
		} finally {
			isCheckingConfiguration.value = false;
		}
	}

	async function createInitialUser(userData: CreateInitialUserRequest): Promise<CreateInitialUserResponse> {
		const data = await api.post<CreateInitialUserResponse>('/selfhosted/initial-user', userData, {
			notify: 'alert',
			successMessage: 'Admin account created successfully.',
		});
		isConfigured.value = true;
		return data;
	}

	function resetConfigurationState(): void {
		isConfigured.value = null;
	}

	/** The cached answer, or one request to the server. */
	async function resolveIsConfigured(): Promise<boolean> {
		if (isConfigured.value !== null) return isConfigured.value;
		return (await checkConfiguration()).isConfigured;
	}

	return {
		isConfigured,
		isCheckingConfiguration,
		isSelfHosted,
		checkConfiguration,
		createInitialUser,
		resetConfigurationState,
		resolveIsConfigured,
	};
});
