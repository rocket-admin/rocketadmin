
export default {
  require: ['./_force-exit.mjs'],
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
  concurrency: 3,
};
