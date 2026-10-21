let registered = false;

// biome-ignore lint/suspicious/noExplicitAny: Monaco instance type not available
export function registerCedarLanguage(monaco: any): void {
	if (registered || !monaco) return;
	registered = true;

	monaco.languages.register({ id: 'cedar' });

	monaco.languages.setMonarchTokensProvider('cedar', {
		keywords: ['permit', 'forbid', 'when', 'unless', 'if', 'then', 'else', 'in', 'has', 'like', 'is'],
		clauses: ['principal', 'action', 'resource', 'context'],
		operators: ['==', '!=', '<', '>', '<=', '>=', '&&', '||', '!'],

		tokenizer: {
			root: [
				// Line comments
				[/\/\/.*$/, 'comment'],

				// Strings
				[/"[^"]*"/, 'string'],

				// Namespace paths (RocketAdmin::Action, etc.)
				[/[A-Z]\w*(?:::[A-Z]\w*)+/, 'type.identifier'],

				// Keywords and clauses
				[
					/[a-z_]\w*/,
					{
						cases: {
							'@keywords': 'keyword',
							'@clauses': 'variable',
							'@default': 'identifier',
						},
					},
				],

				// Operators
				[/[=!<>&|]+/, 'operator'],

				// Delimiters
				[/[(){};,]/, 'delimiter'],

				// Whitespace
				[/\s+/, 'white'],
			],
		},
	});
}
