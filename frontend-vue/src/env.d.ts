/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SAAS: string;
	readonly VITE_API_ROOT: string;
	readonly VITE_SAAS_URL: string;
	readonly VITE_SAAS_HOSTNAMES: string;
	readonly VITE_STAGING_HOST: string;
	readonly VITE_TURNSTILE_SITE_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
