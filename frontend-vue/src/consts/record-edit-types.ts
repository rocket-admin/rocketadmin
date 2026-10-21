// Port of frontend/src/app/consts/record-edit-types.ts. The DB-type tables are kept exactly as in Angular; only the
// component references changed, to lazily loaded Vue SFCs (one chunk per widget, shared by every
// key that maps to it). `Default: ''` is kept so hosts can keep testing the entry for truthiness.
import { defineAsyncComponent } from 'vue';

const BinaryEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/BinaryEdit.vue'));
const BooleanEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/BooleanEdit.vue'));
const CodeEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/CodeEdit.vue'));
const ColorEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/ColorEdit.vue'));
const CountryEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/CountryEdit.vue'));
const DateEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/DateEdit.vue'));
const DateTimeEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/DateTimeEdit.vue'));
const FileEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/FileEdit.vue'));
const ForeignKeyEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/ForeignKeyEdit.vue'));
const IdEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/IdEdit.vue'));
const ImageEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/ImageEdit.vue'));
const JsonEditorEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/JsonEditorEdit.vue'));
const LanguageEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/LanguageEdit.vue'));
const LongTextEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/LongTextEdit.vue'));
const MarkdownEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/MarkdownEdit.vue'));
const MoneyEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/MoneyEdit.vue'));
const NumberEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/NumberEdit.vue'));
const PasswordEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/PasswordEdit.vue'));
const PhoneEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/PhoneEdit.vue'));
const PointEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/PointEdit.vue'));
const RangeEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/RangeEdit.vue'));
const S3Edit = defineAsyncComponent(() => import('@/components/fields/record-edit/S3Edit.vue'));
const SelectEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/SelectEdit.vue'));
const StaticTextEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/StaticTextEdit.vue'));
const TextEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/TextEdit.vue'));
const TimeEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/TimeEdit.vue'));
const TimeIntervalEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/TimeIntervalEdit.vue'));
const TimezoneEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/TimezoneEdit.vue'));
const UrlEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/UrlEdit.vue'));
const UuidEdit = defineAsyncComponent(() => import('@/components/fields/record-edit/UuidEdit.vue'));

export const timestampTypes = [
	'timestamp without time zone',
	'timestamp with time zone',
	'timestamp',
	'date',
	'time without time zone',
	'time with time zone',
	'time',
	'datetime',
	'date time',
	'datetime2',
	'datetimeoffset',
	'curdate',
	'curtime',
	'now',
	'localtime',
	'localtimestamp',
];
export const defaultTimestampValues = {
	postgres: ['current_date', 'current_time', 'current_timestamp', 'localtime', 'localtimestamp', 'now'],
	mysql: ['curdate', 'curtime', 'now'],
};

export const UIwidgets = {
	Default: '',
	Boolean: BooleanEdit,
	Code: CodeEdit,
	Color: ColorEdit,
	Country: CountryEdit,
	Date: DateEdit,
	DateTime: DateTimeEdit,
	Binary: BinaryEdit,
	File: FileEdit,
	Foreign_key: ForeignKeyEdit,
	Image: ImageEdit,
	JSON: JsonEditorEdit,
	Language: LanguageEdit,
	Markdown: MarkdownEdit,
	Money: MoneyEdit,
	Number: NumberEdit,
	Password: PasswordEdit,
	Phone: PhoneEdit,
	Range: RangeEdit,
	Readonly: StaticTextEdit,
	Select: SelectEdit,
	String: TextEdit,
	Textarea: LongTextEdit,
	Time: TimeEdit,
	Timezone: TimezoneEdit,
	URL: UrlEdit,
	UUID: UuidEdit,
	S3: S3Edit,
	Email: TextEdit,
};

export const recordEditTypes = {
	postgres: {
		// numbers (number)
		real: NumberEdit,
		'double precision': NumberEdit,
		smallint: NumberEdit,
		integer: NumberEdit,
		bigint: NumberEdit,
		numeric: NumberEdit,

		//boolean (checkbox)
		boolean: BooleanEdit,

		//datetime (datepicker)
		'timestamp without time zone': DateTimeEdit,
		'timestamp with time zone': DateTimeEdit,
		'time without time zone': TimeEdit,
		'time with time zone': TimeEdit,
		date: DateEdit,
		abstime: DateTimeEdit,
		realtime: DateTimeEdit,
		interval: TimeIntervalEdit, // number + select(seconds, days, weeks, years)

		// short text (text)
		'character varying': TextEdit,
		macaddr: TextEdit, //to do regexp
		macaddr8: TextEdit, //to do regexp
		cidr: TextEdit, //to do regexp
		inet: TextEdit, //to do regexp
		uuid: UuidEdit,

		//long text (textarea)
		text: LongTextEdit,
		xml: LongTextEdit,

		//select (select)
		enum: SelectEdit,

		// json-editor
		json: JsonEditorEdit, //json-editor
		jsonb: JsonEditorEdit, //json-editor
		ARRAY: JsonEditorEdit,

		//binary
		bytea: BinaryEdit,

		//etc
		money: MoneyEdit,

		//mess (math)
		point: PointEdit,
		line: TextEdit,
		circle: TextEdit,
		path: TextEdit,
		box: TextEdit,
		lseg: TextEdit,

		'foreign key': ForeignKeyEdit,
	},

	mysql: {
		// numbers (number)
		tinyint: NumberEdit,
		smallint: NumberEdit,
		mediumint: NumberEdit,
		int: NumberEdit,
		bigint: NumberEdit,
		decimal: NumberEdit,
		float: NumberEdit,
		double: NumberEdit,
		year: NumberEdit,

		//boolean (radiogroup)
		boolean: BooleanEdit,

		//datetime (datepicker)
		date: DateEdit,
		time: TimeEdit,
		datetime: DateTimeEdit,
		timestamp: DateTimeEdit,

		// short text (text)
		char: TextEdit,
		varchar: TextEdit,

		//long text (textarea)
		text: LongTextEdit,
		tinytext: LongTextEdit,
		mediumtext: LongTextEdit,
		longtext: LongTextEdit,

		json: JsonEditorEdit, //json-editor

		//select (select)
		enum: SelectEdit,

		//binary
		binary: BinaryEdit,
		varbinary: BinaryEdit,
		blob: BinaryEdit,
		tinyblob: BinaryEdit,
		mediumblob: BinaryEdit,
		longblob: BinaryEdit,

		//etc
		set: TextEdit, //(text)

		'foreign key': ForeignKeyEdit,
	},

	oracledb: {
		// numbers (number)
		NUMBER: NumberEdit,
		FLOAT: NumberEdit,
		BINARY_FLOAT: NumberEdit,
		BINARY_DOUBLE: NumberEdit,
		'INTERVAL YEAR': NumberEdit,
		'INTERVAL DAY': NumberEdit,

		//datetime (datepicker)
		DATE: DateEdit,
		TIMESTAMP: DateTimeEdit,

		// short text (text)
		CHAR: TextEdit,
		NCHAR: TextEdit,
		CLOB: TextEdit,
		NCLOB: TextEdit,
		VARCHAR2: TextEdit,
		VARCHAR: TextEdit,
		NVARCHAR2: TextEdit,

		//binary
		BLOB: BinaryEdit,
		BFILE: BinaryEdit,
		RAW: BinaryEdit,
		'LONG RAW': BinaryEdit,
		LONG: BinaryEdit,

		'foreign key': ForeignKeyEdit,
	},

	mssql: {
		// numbers (number)
		bigint: NumberEdit,
		int: NumberEdit,
		smallint: NumberEdit,
		tinyint: NumberEdit,
		decimal: NumberEdit,
		bitdecimal: NumberEdit,
		numeric: NumberEdit,
		real: NumberEdit,

		// short text (text)
		uniqueidentifier: UuidEdit,
		char: TextEdit,
		varchar: TextEdit,

		//long text (textarea)
		text: LongTextEdit,
		nchar: LongTextEdit,
		nvarchar: LongTextEdit,
		ntext: LongTextEdit,

		//datetime (datepicker)
		date: DateEdit,
		datetime: DateTimeEdit,
		smalldatetime: DateTimeEdit,
		timestamp: DateTimeEdit,

		//binary
		binary: BinaryEdit,
		varbinary: BinaryEdit,
		image: BinaryEdit,

		// etc
		money: MoneyEdit,
		smallmoney: MoneyEdit,

		'foreign key': ForeignKeyEdit,
	},
	mongodb: {
		// numbers (number)
		number: NumberEdit,
		double: NumberEdit,
		int32: NumberEdit,
		long: NumberEdit,
		decimal128: NumberEdit,

		//boolean (radiogroup)
		boolean: BooleanEdit,

		//datetime (datepicker)
		date: DateEdit,
		timestamp: DateTimeEdit,

		// short text (text)
		string: TextEdit,
		regexp: TextEdit,
		objectid: TextEdit,

		//binary
		binary: BinaryEdit,

		//json
		object: JsonEditorEdit,
		array: JsonEditorEdit,

		//etc
		unknown: TextEdit,

		'foreign key': ForeignKeyEdit,
	},
	dynamodb: {
		string: TextEdit,
		number: NumberEdit,
		boolean: BooleanEdit,
		null: StaticTextEdit,
		array: JsonEditorEdit,
		json: JsonEditorEdit,
		binary: BinaryEdit,
	},
	cassandra: {
		int: NumberEdit,
		bigint: NumberEdit,
		varint: NumberEdit,
		decimal: NumberEdit,
		float: NumberEdit,
		double: NumberEdit,

		boolean: BooleanEdit,

		timeuuid: IdEdit,

		timestamp: DateTimeEdit,
		date: DateEdit,
		time: TimeEdit,

		uuid: UuidEdit,
		varchar: TextEdit,
		inet: TextEdit,
		ascii: TextEdit,
		text: TextEdit,

		//binary
		blob: BinaryEdit,

		list: JsonEditorEdit,
		map: JsonEditorEdit,
		set: JsonEditorEdit,
	},
	redis: {
		string: TextEdit,
		integer: NumberEdit,
		decimal: NumberEdit,
		boolean: BooleanEdit,
		array: JsonEditorEdit,
		json: JsonEditorEdit,
	},
	elasticsearch: {
		string: TextEdit,
		number: NumberEdit,
		boolean: BooleanEdit,
		date: DateEdit,
		object: JsonEditorEdit,
		array: JsonEditorEdit,
		binary: BinaryEdit,
	},
	clickhouse: {
		string: TextEdit,
		uuid: UuidEdit,
		boolean: BooleanEdit,
		integer: NumberEdit,
		bigint: NumberEdit,
		float: NumberEdit,
		double: NumberEdit,
		decimal: NumberEdit,
		date: DateEdit,
		datetime: DateTimeEdit,
		json: JsonEditorEdit,
		object: JsonEditorEdit,
		array: JsonEditorEdit,
	},
};
