// Port of frontend/src/app/consts/table-display-types.ts. The DB-type tables are kept exactly as in Angular; only the
// component references changed, to lazily loaded Vue SFCs (one chunk per widget, shared by every
// key that maps to it). `Default: ''` is kept so hosts can keep testing the entry for truthiness.
import { defineAsyncComponent } from 'vue';

const BinaryDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/BinaryDisplay.vue'));
const BooleanDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/BooleanDisplay.vue'));
const CodeDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/CodeDisplay.vue'));
const ColorDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/ColorDisplay.vue'));
const CountryDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/CountryDisplay.vue'));
const DateDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/DateDisplay.vue'));
const DateTimeDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/DateTimeDisplay.vue'));
const FileDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/FileDisplay.vue'));
const ForeignKeyDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/ForeignKeyDisplay.vue'));
const IdDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/IdDisplay.vue'));
const ImageDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/ImageDisplay.vue'));
const JsonEditorDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/JsonEditorDisplay.vue'));
const LanguageDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/LanguageDisplay.vue'));
const LongTextDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/LongTextDisplay.vue'));
const MarkdownDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/MarkdownDisplay.vue'));
const MoneyDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/MoneyDisplay.vue'));
const NumberDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/NumberDisplay.vue'));
const PasswordDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/PasswordDisplay.vue'));
const PhoneDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/PhoneDisplay.vue'));
const PointDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/PointDisplay.vue'));
const RangeDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/RangeDisplay.vue'));
const S3Display = defineAsyncComponent(() => import('@/components/fields/table-display/S3Display.vue'));
const SelectDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/SelectDisplay.vue'));
const StaticTextDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/StaticTextDisplay.vue'));
const TextDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/TextDisplay.vue'));
const TimeDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/TimeDisplay.vue'));
const TimeIntervalDisplay = defineAsyncComponent(
	() => import('@/components/fields/table-display/TimeIntervalDisplay.vue'),
);
const TimezoneDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/TimezoneDisplay.vue'));
const UrlDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/UrlDisplay.vue'));
const UuidDisplay = defineAsyncComponent(() => import('@/components/fields/table-display/UuidDisplay.vue'));

export const UIwidgets = {
	Default: '',
	Boolean: BooleanDisplay,
	Code: CodeDisplay,
	Color: ColorDisplay,
	Country: CountryDisplay,
	Date: DateDisplay,
	DateTime: DateTimeDisplay,
	Binary: BinaryDisplay,
	File: FileDisplay,
	Foreign_key: ForeignKeyDisplay,
	Image: ImageDisplay,
	JSON: JsonEditorDisplay,
	Language: LanguageDisplay,
	Markdown: MarkdownDisplay,
	Money: MoneyDisplay,
	Number: NumberDisplay,
	Password: PasswordDisplay,
	Phone: PhoneDisplay,
	Range: RangeDisplay,
	Readonly: StaticTextDisplay,
	Select: SelectDisplay,
	String: TextDisplay,
	Textarea: LongTextDisplay,
	Time: TimeDisplay,
	Timezone: TimezoneDisplay,
	URL: UrlDisplay,
	UUID: UuidDisplay,
	S3: S3Display,
	Email: TextDisplay,
};

export const tableDisplayTypes = {
	postgres: {
		// numbers (number)
		real: NumberDisplay,
		'double precision': NumberDisplay,
		smallint: NumberDisplay,
		integer: NumberDisplay,
		bigint: NumberDisplay,
		numeric: NumberDisplay,

		//boolean (checkbox)
		boolean: BooleanDisplay,

		//datetime (datepicker)
		'timestamp without time zone': DateTimeDisplay,
		'timestamp with time zone': DateTimeDisplay,
		'time without time zone': TimeDisplay,
		'time with time zone': TimeDisplay,
		date: DateDisplay,
		abstime: DateTimeDisplay,
		realtime: DateTimeDisplay,
		interval: TimeIntervalDisplay,

		// short text (text)
		'character varying': TextDisplay,
		macaddr: TextDisplay,
		macaddr8: TextDisplay,
		cidr: TextDisplay,
		inet: TextDisplay,
		uuid: UuidDisplay,

		//long text (textarea)
		text: LongTextDisplay,
		xml: LongTextDisplay,

		//select (select)
		enum: SelectDisplay,

		// json-editor
		json: JsonEditorDisplay,
		jsonb: JsonEditorDisplay,
		ARRAY: JsonEditorDisplay,

		//binary
		bytea: BinaryDisplay,

		//etc
		money: MoneyDisplay,

		//mess (math)
		point: PointDisplay,
		line: TextDisplay,
		circle: TextDisplay,
		path: TextDisplay,
		box: TextDisplay,
		lseg: TextDisplay,

		'foreign key': ForeignKeyDisplay,
	},

	mysql: {
		// numbers (number)
		tinyint: NumberDisplay,
		smallint: NumberDisplay,
		mediumint: NumberDisplay,
		int: NumberDisplay,
		bigint: NumberDisplay,
		decimal: NumberDisplay,
		float: NumberDisplay,
		double: NumberDisplay,
		year: NumberDisplay,

		//boolean (radiogroup)
		boolean: BooleanDisplay,

		//datetime (datepicker)
		date: DateDisplay,
		time: TimeDisplay,
		datetime: DateTimeDisplay,
		timestamp: DateTimeDisplay,

		// short text (text)
		char: TextDisplay,
		varchar: TextDisplay,

		//long text (textarea)
		text: LongTextDisplay,
		tinytext: LongTextDisplay,
		mediumtext: LongTextDisplay,
		longtext: LongTextDisplay,

		json: JsonEditorDisplay, //json-editor

		//select (select)
		enum: SelectDisplay,

		//binary
		binary: BinaryDisplay,
		varbinary: BinaryDisplay,
		blob: BinaryDisplay,
		tinyblob: BinaryDisplay,
		mediumblob: BinaryDisplay,
		longblob: BinaryDisplay,

		//etc
		set: TextDisplay,

		'foreign key': ForeignKeyDisplay,
	},

	oracledb: {
		// numbers (number)
		NUMBER: NumberDisplay,
		FLOAT: NumberDisplay,
		BINARY_FLOAT: NumberDisplay,
		BINARY_DOUBLE: NumberDisplay,
		'INTERVAL YEAR': NumberDisplay,
		'INTERVAL DAY': NumberDisplay,

		//datetime (datepicker)
		DATE: DateDisplay,
		TIMESTAMP: DateTimeDisplay,

		// short text (text)
		CHAR: TextDisplay,
		NCHAR: TextDisplay,
		CLOB: TextDisplay,
		NCLOB: TextDisplay,
		VARCHAR2: TextDisplay,
		VARCHAR: TextDisplay,
		NVARCHAR2: TextDisplay,

		//binary
		BLOB: BinaryDisplay,
		BFILE: BinaryDisplay,
		RAW: BinaryDisplay,
		'LONG RAW': BinaryDisplay,
		LONG: BinaryDisplay,

		'foreign key': ForeignKeyDisplay,
	},

	mssql: {
		// numbers (number)
		bigint: NumberDisplay,
		int: NumberDisplay,
		smallint: NumberDisplay,
		tinyint: NumberDisplay,
		decimal: NumberDisplay,
		bitdecimal: NumberDisplay,
		numeric: NumberDisplay,
		real: NumberDisplay,

		// short text (text)
		uniqueidentifier: UuidDisplay,
		char: TextDisplay,
		varchar: TextDisplay,

		//long text (textarea)
		text: LongTextDisplay,
		nchar: LongTextDisplay,
		nvarchar: LongTextDisplay,
		ntext: LongTextDisplay,

		//datetime (datepicker)
		date: DateDisplay,
		datetime: DateTimeDisplay,
		smalldatetime: DateTimeDisplay,
		timestamp: DateTimeDisplay,

		//binary
		binary: BinaryDisplay,
		varbinary: BinaryDisplay,
		image: ImageDisplay,

		// etc
		money: MoneyDisplay,
		smallmoney: MoneyDisplay,

		'foreign key': ForeignKeyDisplay,
	},
	mongodb: {
		// numbers (number)
		number: NumberDisplay,
		double: NumberDisplay,
		int32: NumberDisplay,
		long: NumberDisplay,
		decimal128: NumberDisplay,

		//boolean (radiogroup)
		boolean: BooleanDisplay,

		//datetime (datepicker)
		date: DateDisplay,
		timestamp: DateTimeDisplay,

		// short text (text)
		string: TextDisplay,
		regexp: TextDisplay,
		objectid: TextDisplay,

		//binary
		binary: BinaryDisplay,

		//json
		object: JsonEditorDisplay,
		array: JsonEditorDisplay,

		//etc
		unknown: TextDisplay,

		'foreign key': ForeignKeyDisplay,
	},
	dynamodb: {
		string: TextDisplay,
		number: NumberDisplay,
		boolean: BooleanDisplay,
		null: StaticTextDisplay,
		array: JsonEditorDisplay,
		json: JsonEditorDisplay,
		binary: BinaryDisplay,
	},
	cassandra: {
		int: NumberDisplay,
		bigint: NumberDisplay,
		varint: NumberDisplay,
		decimal: NumberDisplay,
		float: NumberDisplay,
		double: NumberDisplay,

		boolean: BooleanDisplay,

		timeuuid: IdDisplay,

		timestamp: DateTimeDisplay,
		date: DateDisplay,
		time: TimeDisplay,

		uuid: UuidDisplay,
		varchar: TextDisplay,
		inet: TextDisplay,
		ascii: TextDisplay,
		text: LongTextDisplay,

		//binary
		blob: BinaryDisplay,

		list: JsonEditorDisplay,
		map: JsonEditorDisplay,
		set: JsonEditorDisplay,
	},
	redis: {
		string: TextDisplay,
		integer: NumberDisplay,
		decimal: NumberDisplay,
		boolean: BooleanDisplay,
		array: JsonEditorDisplay,
		json: JsonEditorDisplay,
	},
	elasticsearch: {
		string: TextDisplay,
		number: NumberDisplay,
		boolean: BooleanDisplay,
		date: DateDisplay,
		object: JsonEditorDisplay,
		array: JsonEditorDisplay,
		binary: BinaryDisplay,
	},
	clickhouse: {
		string: TextDisplay,
		uuid: UuidDisplay,
		boolean: BooleanDisplay,
		integer: NumberDisplay,
		bigint: NumberDisplay,
		float: NumberDisplay,
		double: NumberDisplay,
		decimal: NumberDisplay,
		date: DateDisplay,
		datetime: DateTimeDisplay,
		json: JsonEditorDisplay,
		object: JsonEditorDisplay,
		array: JsonEditorDisplay,
	},
};
