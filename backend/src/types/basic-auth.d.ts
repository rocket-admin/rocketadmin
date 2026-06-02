declare module 'basic-auth' {
	import type { IncomingMessage } from 'node:http';

	interface BasicAuthResult {
		name: string;
		pass: string;
	}

	function auth(req: IncomingMessage): BasicAuthResult | undefined;
	namespace auth {
		function parse(string: string): BasicAuthResult | undefined;
	}

	export = auth;
}
