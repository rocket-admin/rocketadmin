
export default {
  files: ['test/ava-tests/**'],
  typescript: {
    extensions: ['ts'],
    rewritePaths: {
      'src/': 'dist/src/',
      'test/': 'dist/test/',
    },
    compile: 'tsc',
  },
  workerThreads: false,
  verbose: true,
  timeout: '5m',
  // failFast: true,
  concurrency: 3,
};
