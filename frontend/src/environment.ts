import { version } from './version';

export interface Environment {
	production: boolean;
	saas: boolean;
	apiRoot: string;
	saasURL: string;
	saasHostnames: string[];
	stagingHost: string;
	version: string;
	turnstileSiteKey: string;
}

export function buildEnvironment(env: Record<string, string | boolean | undefined>): Environment {
	return {
		production: env.PROD === true,
		saas: env.VITE_SAAS === 'true',
		apiRoot: String(env.VITE_API_ROOT ?? ''),
		saasURL: String(env.VITE_SAAS_URL ?? ''),
		saasHostnames: String(env.VITE_SAAS_HOSTNAMES ?? '')
			.split(',')
			.map((hostname) => hostname.trim())
			.filter(Boolean),
		stagingHost: String(env.VITE_STAGING_HOST ?? ''),
		version,
		turnstileSiteKey: String(env.VITE_TURNSTILE_SITE_KEY ?? ''),
	};
}

// Same shape as `environment` in frontend/src/environments/*.ts, built from the Vite mode's .env files.
export const environment: Environment = buildEnvironment(import.meta.env);
