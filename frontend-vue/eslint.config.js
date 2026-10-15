// biome lints and formats TS/JS; ESLint covers what biome can't see inside .vue single-file components.
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: ['dist/**', 'node_modules/**'] },
	{
		files: ['**/*.vue'],
		extends: [...tseslint.configs.recommended, ...pluginVue.configs['flat/recommended']],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions: ['.vue'],
				sourceType: 'module',
			},
		},
		rules: {
			// Formatting is biome's job (tabs, 120 columns).
			'vue/html-indent': ['error', 'tab'],
			'vue/max-attributes-per-line': 'off',
			'vue/singleline-html-element-content-max-length': 'off',
			'vue/singleline-html-element-content-newline': 'off',
		},
	},
);
