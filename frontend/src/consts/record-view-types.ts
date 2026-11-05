// Port of frontend/src/app/consts/record-view-types.ts. The DB-type tables are kept exactly as in Angular; only the
// component references changed, to lazily loaded Vue SFCs (one chunk per widget, shared by every
// key that maps to it). `Default: ''` is kept so hosts can keep testing the entry for truthiness.
import { defineAsyncComponent } from 'vue';

const BinaryRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/BinaryRecordView.vue'));
const BooleanRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/BooleanRecordView.vue'));
const CodeRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/CodeRecordView.vue'));
const ColorRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/ColorRecordView.vue'));
const CountryRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/CountryRecordView.vue'));
const DateRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/DateRecordView.vue'));
const DateTimeRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/DateTimeRecordView.vue'));
const FileRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/FileRecordView.vue'));
const ForeignKeyRecordView = defineAsyncComponent(
	() => import('@/components/fields/record-view/ForeignKeyRecordView.vue'),
);
const IdRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/IdRecordView.vue'));
const ImageRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/ImageRecordView.vue'));
const JsonEditorRecordView = defineAsyncComponent(
	() => import('@/components/fields/record-view/JsonEditorRecordView.vue'),
);
const LanguageRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/LanguageRecordView.vue'));
const LongTextRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/LongTextRecordView.vue'));
const MarkdownRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/MarkdownRecordView.vue'));
const MoneyRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/MoneyRecordView.vue'));
const NumberRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/NumberRecordView.vue'));
const PasswordRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/PasswordRecordView.vue'));
const PhoneRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/PhoneRecordView.vue'));
const PointRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/PointRecordView.vue'));
const RangeRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/RangeRecordView.vue'));
const S3RecordView = defineAsyncComponent(() => import('@/components/fields/record-view/S3RecordView.vue'));
const SelectRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/SelectRecordView.vue'));
const StaticTextRecordView = defineAsyncComponent(
	() => import('@/components/fields/record-view/StaticTextRecordView.vue'),
);
const TextRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/TextRecordView.vue'));
const TimeIntervalRecordView = defineAsyncComponent(
	() => import('@/components/fields/record-view/TimeIntervalRecordView.vue'),
);
const TimeRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/TimeRecordView.vue'));
const TimezoneRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/TimezoneRecordView.vue'));
const UrlRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/UrlRecordView.vue'));
const UuidRecordView = defineAsyncComponent(() => import('@/components/fields/record-view/UuidRecordView.vue'));

export const UIwidgets = {
	Default: '',
	Boolean: BooleanRecordView,
	Date: DateRecordView,
	Time: TimeRecordView,
	DateTime: DateTimeRecordView,
	JSON: JsonEditorRecordView,
	Language: LanguageRecordView,
	Markdown: MarkdownRecordView,
	Textarea: LongTextRecordView,
	String: TextRecordView,
	Readonly: StaticTextRecordView,
	Number: NumberRecordView,
	Select: SelectRecordView,
	Password: PasswordRecordView,
	Binary: BinaryRecordView,
	File: FileRecordView,
	Code: CodeRecordView,
	Image: ImageRecordView,
	URL: UrlRecordView,
	Country: CountryRecordView,
	Phone: PhoneRecordView,
	Money: MoneyRecordView,
	Foreign_key: ForeignKeyRecordView,
	Color: ColorRecordView,
	UUID: UuidRecordView,
	Range: RangeRecordView,
	Timezone: TimezoneRecordView,
	S3: S3RecordView,
};

export const recordViewFieldTypes = {
	postgres: {
		// numbers (number)
		real: NumberRecordView,
		'double precision': NumberRecordView,
		smallint: NumberRecordView,
		integer: NumberRecordView,
		bigint: NumberRecordView,
		numeric: NumberRecordView,

		//boolean (checkbox)
		boolean: BooleanRecordView,

		//datetime (datepicker)
		'timestamp without time zone': DateTimeRecordView,
		'timestamp with time zone': DateTimeRecordView,
		'time without time zone': TimeRecordView,
		'time with time zone': TimeRecordView,
		date: DateRecordView,
		abstime: DateTimeRecordView,
		realtime: DateTimeRecordView,
		interval: TimeIntervalRecordView,

		// short text (text)
		'character varying': TextRecordView,
		macaddr: TextRecordView,
		macaddr8: TextRecordView,
		cidr: TextRecordView,
		inet: TextRecordView,
		uuid: UuidRecordView,

		//long text (textarea)
		text: LongTextRecordView,
		xml: LongTextRecordView,

		//select (select)
		enum: SelectRecordView,

		// json-editor
		json: JsonEditorRecordView,
		jsonb: JsonEditorRecordView,
		ARRAY: JsonEditorRecordView,

		//binary
		bytea: BinaryRecordView,

		//etc
		money: MoneyRecordView,

		//mess (math)
		point: PointRecordView,
		line: TextRecordView,
		circle: TextRecordView,
		path: TextRecordView,
		box: TextRecordView,
		lseg: TextRecordView,

		'foreign key': ForeignKeyRecordView,
	},

	mysql: {
		// numbers (number)
		tinyint: NumberRecordView,
		smallint: NumberRecordView,
		mediumint: NumberRecordView,
		int: NumberRecordView,
		bigint: NumberRecordView,
		decimal: NumberRecordView,
		float: NumberRecordView,
		double: NumberRecordView,
		year: NumberRecordView,

		//boolean (radiogroup)
		boolean: BooleanRecordView,

		//datetime (datepicker)
		date: DateRecordView,
		time: TimeRecordView,
		datetime: DateTimeRecordView,
		timestamp: DateTimeRecordView,

		// short text (text)
		char: TextRecordView,
		varchar: TextRecordView,

		//long text (textarea)
		text: LongTextRecordView,
		tinytext: LongTextRecordView,
		mediumtext: LongTextRecordView,
		longtext: LongTextRecordView,

		json: JsonEditorRecordView, //json-editor

		//select (select)
		enum: SelectRecordView,

		//binary
		binary: BinaryRecordView,
		varbinary: BinaryRecordView,
		blob: BinaryRecordView,
		tinyblob: BinaryRecordView,
		mediumblob: BinaryRecordView,
		longblob: BinaryRecordView,

		//etc
		set: TextRecordView,

		'foreign key': ForeignKeyRecordView,
	},

	oracledb: {
		// numbers (number)
		NUMBER: NumberRecordView,
		FLOAT: NumberRecordView,
		BINARY_FLOAT: NumberRecordView,
		BINARY_DOUBLE: NumberRecordView,
		'INTERVAL YEAR': NumberRecordView,
		'INTERVAL DAY': NumberRecordView,

		//datetime (datepicker)
		DATE: DateRecordView,
		TIMESTAMP: DateTimeRecordView,

		// short text (text)
		CHAR: TextRecordView,
		NCHAR: TextRecordView,
		CLOB: TextRecordView,
		NCLOB: TextRecordView,
		VARCHAR2: TextRecordView,
		VARCHAR: TextRecordView,
		NVARCHAR2: TextRecordView,

		//binary
		BLOB: BinaryRecordView,
		BFILE: BinaryRecordView,
		RAW: BinaryRecordView,
		'LONG RAW': BinaryRecordView,
		LONG: BinaryRecordView,

		'foreign key': ForeignKeyRecordView,
	},

	mssql: {
		// numbers (number)
		bigint: NumberRecordView,
		int: NumberRecordView,
		smallint: NumberRecordView,
		tinyint: NumberRecordView,
		decimal: NumberRecordView,
		bitdecimal: NumberRecordView,
		numeric: NumberRecordView,
		real: NumberRecordView,

		// short text (text)
		uniqueidentifier: UuidRecordView,
		char: TextRecordView,
		varchar: TextRecordView,

		//long text (textarea)
		text: LongTextRecordView,
		nchar: LongTextRecordView,
		nvarchar: LongTextRecordView,
		ntext: LongTextRecordView,

		//datetime (datepicker)
		date: DateRecordView,
		datetime: DateTimeRecordView,
		smalldatetime: DateTimeRecordView,
		timestamp: DateTimeRecordView,

		//binary
		binary: BinaryRecordView,
		varbinary: BinaryRecordView,
		image: ImageRecordView,

		// etc
		money: MoneyRecordView,
		smallmoney: MoneyRecordView,

		'foreign key': ForeignKeyRecordView,
	},
	mongodb: {
		// numbers (number)
		number: NumberRecordView,
		double: NumberRecordView,
		int32: NumberRecordView,
		long: NumberRecordView,
		decimal128: NumberRecordView,

		//boolean (radiogroup)
		boolean: BooleanRecordView,

		//datetime (datepicker)
		date: DateRecordView,
		timestamp: DateTimeRecordView,

		// short text (text)
		string: TextRecordView,
		regexp: TextRecordView,
		objectid: TextRecordView,

		//binary
		binary: BinaryRecordView,

		//json
		object: JsonEditorRecordView,
		array: JsonEditorRecordView,

		//etc
		unknown: TextRecordView,

		'foreign key': ForeignKeyRecordView,
	},
	dynamodb: {
		string: TextRecordView,
		number: NumberRecordView,
		boolean: BooleanRecordView,
		null: StaticTextRecordView,
		array: JsonEditorRecordView,
		json: JsonEditorRecordView,
		binary: BinaryRecordView,
	},
	cassandra: {
		int: NumberRecordView,
		bigint: NumberRecordView,
		varint: NumberRecordView,
		decimal: NumberRecordView,
		float: NumberRecordView,
		double: NumberRecordView,

		boolean: BooleanRecordView,

		timeuuid: IdRecordView,

		timestamp: DateTimeRecordView,
		date: DateRecordView,
		time: TimeRecordView,

		uuid: UuidRecordView,
		varchar: TextRecordView,
		inet: TextRecordView,
		ascii: TextRecordView,
		text: LongTextRecordView,

		//binary
		blob: BinaryRecordView,

		list: JsonEditorRecordView,
		map: JsonEditorRecordView,
		set: JsonEditorRecordView,
	},
	redis: {
		string: TextRecordView,
		integer: NumberRecordView,
		decimal: NumberRecordView,
		boolean: BooleanRecordView,
		array: JsonEditorRecordView,
		json: JsonEditorRecordView,
	},
	elasticsearch: {
		string: TextRecordView,
		number: NumberRecordView,
		boolean: BooleanRecordView,
		date: DateRecordView,
		object: JsonEditorRecordView,
		array: JsonEditorRecordView,
		binary: BinaryRecordView,
	},
	clickhouse: {
		string: TextRecordView,
		uuid: UuidRecordView,
		boolean: BooleanRecordView,
		integer: NumberRecordView,
		bigint: NumberRecordView,
		float: NumberRecordView,
		double: NumberRecordView,
		decimal: NumberRecordView,
		date: DateRecordView,
		datetime: DateTimeRecordView,
		json: JsonEditorRecordView,
		object: JsonEditorRecordView,
		array: JsonEditorRecordView,
	},
};
