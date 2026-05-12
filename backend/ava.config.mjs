const concurrencyFromEnv = Number.parseInt(process.env.AVA_CONCURRENCY ?? '', 10);

export default {
	require: ['./_setup-worker-db.mjs', './_force-exit.mjs'],
	files: ['test/ava-tests/**'],
	typescript: {
		extensions: ['ts'],
		rewritePaths: {
			'src/': 'dist/src/',
			'test/': 'dist/test/',
		},
		compile: false,
	},
	workerThreads: false,
	verbose: true,
	timeout: '5m',
	failFast: false,
	concurrency: Number.isFinite(concurrencyFromEnv) && concurrencyFromEnv > 0 ? concurrencyFromEnv : 3,
};
