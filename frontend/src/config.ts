export interface AppConfig {
	baseURL: string;
	saasURL: string;
}

// Same values as public/config.json, used when the runtime file is missing or broken.
export const defaultConfig: AppConfig = {
	baseURL: '/api',
	saasURL: '',
};

let config: AppConfig = { ...defaultConfig };

// Port of ConfigModule.buildForConfigUrl: reads config.json before the app mounts,
// so the deployed file can be swapped without rebuilding the bundle.
export async function loadConfig(configUrl: string, fetchFn: typeof fetch = fetch): Promise<AppConfig> {
	try {
		const response = await fetchFn(configUrl, { cache: 'no-cache' });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const json = (await response.json()) as Partial<AppConfig>;
		config = {
			baseURL: typeof json.baseURL === 'string' ? json.baseURL : defaultConfig.baseURL,
			saasURL: typeof json.saasURL === 'string' ? json.saasURL : defaultConfig.saasURL,
		};
	} catch (error) {
		console.error(`Failed to load ${configUrl}, using defaults`, error);
		config = { ...defaultConfig };
	}
	return config;
}

export function getConfig(): AppConfig {
	return config;
}
