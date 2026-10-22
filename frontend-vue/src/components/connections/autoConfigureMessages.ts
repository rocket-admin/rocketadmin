// The auto-configure page's reading of the AI setup log (AutoConfigureComponent's _humanize,
// _widgetPhrase and _countMessage): backend progress lines become short user-facing sentences, and
// widget / setting lines are counted for the summary chips.

export interface CountedMessage {
	/** A widget was added, a table setting was set, or neither. */
	kind: 'widget' | 'setting' | null;
	/** The table the line configured, if any. */
	table: string | null;
}

export function countMessage(text: string): CountedMessage {
	const widgetMatch = text.match(/^Added\s+\S+\s+widget for table "([^"]+)"/i);
	if (widgetMatch?.[1]) return { kind: 'widget', table: widgetMatch[1] };
	const settingMatch = text.match(/^Set up settings for table "([^"]+)",\s+\S+ parameter/i);
	if (settingMatch?.[1]) return { kind: 'setting', table: settingMatch[1] };
	const defaultsMatch = text.match(/^Set up settings for table "([^"]+)" with default parameters/i);
	if (defaultsMatch?.[1]) return { kind: null, table: defaultsMatch[1] };
	return { kind: null, table: null };
}

const tables = (count: string) => `${count} ${count === '1' ? 'table' : 'tables'}`;

export function humanizeMessage(text: string): string {
	if (/^Initializing|^Starting configuration|^✓ Setup complete|^All done/i.test(text)) return text;
	if (/^Starting AI scan/i.test(text)) return 'Looking at your database…';
	if (/^Fetching tables from database/i.test(text)) return 'Reading your tables…';

	let m = text.match(/^Found (\d+) new (?:table|tables) to scan/i);
	if (m?.[1]) return `Found ${tables(m[1])} to set up`;
	if (/^No new tables to scan/i.test(text)) return 'Everything is already set up';

	m = text.match(/^Inspected structure of table "([^"]+)"/i);
	if (m) return `Read structure of ${m[1]}`;

	m = text.match(/^Generating settings with AI for (\d+)/i);
	if (m?.[1]) return `Choosing the best layout for ${tables(m[1])}…`;

	m = text.match(/^AI returned settings for (\d+)/i);
	if (m?.[1]) return `Recommendations ready for ${tables(m[1])}`;

	m = text.match(/^Validation failed for table "([^"]+)"/i);
	if (m) return `Couldn't configure ${m[1]}, skipped it`;

	m = text.match(/^Set up settings for table "([^"]+)", display_name parameter set to "([^"]+)"/i);
	if (m) return `Renamed ${m[1]} → ${m[2]}`;

	m = text.match(/^Set up settings for table "([^"]+)", search_fields parameter set to (.+)$/i);
	if (m) return `Search by ${m[2]} in ${m[1]}`;

	m = text.match(/^Set up settings for table "([^"]+)", readonly_fields parameter set to (.+)$/i);
	if (m) return `Locked fields in ${m[1]}: ${m[2]}`;

	m = text.match(/^Set up settings for table "([^"]+)", columns_view parameter set to (.+)$/i);
	if (m) return `Showing ${m[2]} on ${m[1]} overview`;

	m = text.match(/^Set up settings for table "([^"]+)", ordering parameter set to (ASC|DESC)/i);
	if (m?.[2]) return `${m[1]} sorted ${m[2].toLowerCase() === 'asc' ? 'ascending' : 'descending'} by default`;

	m = text.match(/^Set up settings for table "([^"]+)", ordering_field parameter set to "([^"]+)"/i);
	if (m) return `${m[1]} sorts by ${m[2]} by default`;

	m = text.match(/^Set up settings for table "([^"]+)", identity_column parameter set to "([^"]+)"/i);
	if (m) return `${m[1]} identified by ${m[2]}`;

	m = text.match(/^Set up settings for table "([^"]+)" with default parameters/i);
	if (m) return `${m[1]} is ready with default setup`;

	m = text.match(/^Added (\S+) widget for table "([^"]+)" on column "([^"]+)"/i);
	if (m?.[1] && m[2] && m[3]) return widgetPhrase(m[1], m[2], m[3]);

	// Generic fallback for any unmatched "Set up settings ... <param> parameter ..." line.
	m = text.match(/^Set up settings for table "([^"]+)", (\S+) parameter/i);
	if (m?.[2]) return `${m[1]}: ${m[2].replace(/_/g, ' ')} configured`;

	return text;
}

function widgetPhrase(kind: string, table: string, column: string): string {
	const ref = `${table}.${column}`;
	switch (kind.toLowerCase()) {
		case 'phone':
			return `${ref} formatted as phone numbers`;
		case 'uuid':
			return `${ref} recognized as ID`;
		case 'country':
			return `${ref} shows country flags`;
		case 'url':
			return `${ref} shown as clickable link`;
		case 'color':
			return `${ref} shows a color swatch`;
		case 'string':
			return `${ref} validates email format`;
		default:
			return `${kind} widget enabled for ${ref}`;
	}
}
