// Port of frontend/src/app/consts/filter-types.ts. The DB-type tables are kept exactly as in Angular; only the
// component references changed, to lazily loaded Vue SFCs (one chunk per widget, shared by every
// key that maps to it). `Default: ''` is kept so hosts can keep testing the entry for truthiness.
import { defineAsyncComponent } from 'vue';

const BinaryFilter = defineAsyncComponent(() => import('@/components/fields/filter/BinaryFilter.vue'));
const BooleanFilter = defineAsyncComponent(() => import('@/components/fields/filter/BooleanFilter.vue'));
const CountryFilter = defineAsyncComponent(() => import('@/components/fields/filter/CountryFilter.vue'));
const DateFilter = defineAsyncComponent(() => import('@/components/fields/filter/DateFilter.vue'));
const DateTimeFilter = defineAsyncComponent(() => import('@/components/fields/filter/DateTimeFilter.vue'));
const EmailFilter = defineAsyncComponent(() => import('@/components/fields/filter/EmailFilter.vue'));
const FileFilter = defineAsyncComponent(() => import('@/components/fields/filter/FileFilter.vue'));
const ForeignKeyFilter = defineAsyncComponent(() => import('@/components/fields/filter/ForeignKeyFilter.vue'));
const IdFilter = defineAsyncComponent(() => import('@/components/fields/filter/IdFilter.vue'));
const JsonEditorFilter = defineAsyncComponent(() => import('@/components/fields/filter/JsonEditorFilter.vue'));
const LongTextFilter = defineAsyncComponent(() => import('@/components/fields/filter/LongTextFilter.vue'));
const NumberFilter = defineAsyncComponent(() => import('@/components/fields/filter/NumberFilter.vue'));
const PasswordFilter = defineAsyncComponent(() => import('@/components/fields/filter/PasswordFilter.vue'));
const PhoneFilter = defineAsyncComponent(() => import('@/components/fields/filter/PhoneFilter.vue'));
const PointFilter = defineAsyncComponent(() => import('@/components/fields/filter/PointFilter.vue'));
const SelectFilter = defineAsyncComponent(() => import('@/components/fields/filter/SelectFilter.vue'));
const StaticTextFilter = defineAsyncComponent(() => import('@/components/fields/filter/StaticTextFilter.vue'));
const TextFilter = defineAsyncComponent(() => import('@/components/fields/filter/TextFilter.vue'));
const TimeFilter = defineAsyncComponent(() => import('@/components/fields/filter/TimeFilter.vue'));
const TimeIntervalFilter = defineAsyncComponent(() => import('@/components/fields/filter/TimeIntervalFilter.vue'));
const TimezoneFilter = defineAsyncComponent(() => import('@/components/fields/filter/TimezoneFilter.vue'));

export const UIwidgets = {
	Default: '',
	Boolean: BooleanFilter,
	Country: CountryFilter,
	Date: DateFilter,
	DateTime: DateTimeFilter,
	Binary: BinaryFilter,
	File: FileFilter,
	Foreign_key: ForeignKeyFilter,
	JSON: JsonEditorFilter,
	Number: NumberFilter,
	Password: PasswordFilter,
	Readonly: StaticTextFilter,
	Select: SelectFilter,
	String: TextFilter,
	Textarea: LongTextFilter,
	Time: TimeFilter,
	TimeInterval: TimeIntervalFilter,
	Timezone: TimezoneFilter,
	Point: PointFilter,
	ID: IdFilter,
	Phone: PhoneFilter,
	Email: EmailFilter,
};

export const filterTypes = {
	postgres: {
		// numbers (number)
		real: NumberFilter,
		'double precision': NumberFilter,
		smallint: NumberFilter,
		integer: NumberFilter,
		bigint: NumberFilter,
		numeric: NumberFilter,

		//boolean (checkbox)
		boolean: BooleanFilter,

		//datetime (datepicker)
		'timestamp without time zone': DateTimeFilter,
		'timestamp with time zone': DateTimeFilter,
		date: DateFilter,
		abstime: DateTimeFilter,
		realtime: DateTimeFilter,
		interval: TimeIntervalFilter, // number + select(seconds, days, weeks, years)

		// short text (text)
		'character varying': TextFilter,
		macaddr: TextFilter, //to do regexp
		macaddr8: TextFilter, //to do regexp
		cidr: TextFilter, //to do regexp
		inet: TextFilter, //to do regexp
		uuid: TextFilter, //to do regexp

		//long text (textarea)
		text: LongTextFilter,
		xml: LongTextFilter,

		//select (select)
		enum: SelectFilter,

		// json-editor
		json: JsonEditorFilter, //json-editor
		jsonb: JsonEditorFilter, //json-editor

		//binary
		bytea: BinaryFilter,

		//etc
		money: TextFilter,

		//mess (math)
		point: PointFilter,
		line: TextFilter,
		circle: TextFilter,
		path: TextFilter,
		box: TextFilter,
		lseg: TextFilter,

		'foreign key': ForeignKeyFilter,
	},

	mysql: {
		// numbers (number)
		tinyint: NumberFilter,
		smallint: NumberFilter,
		mediumint: NumberFilter,
		int: NumberFilter,
		bigint: NumberFilter,
		decimal: NumberFilter,
		float: NumberFilter,
		double: NumberFilter,
		year: NumberFilter,

		//boolean (radiogroup)
		boolean: BooleanFilter,

		//datetime (datepicker)
		date: DateFilter,
		time: TimeFilter,
		datetime: DateTimeFilter,
		timestamp: DateTimeFilter,

		// short text (text)
		char: TextFilter,
		varchar: TextFilter,

		//long text (textarea)
		text: LongTextFilter,
		tinytext: LongTextFilter,
		mediumtext: LongTextFilter,
		longtext: LongTextFilter,

		json: JsonEditorFilter, //json-editor

		//select (select)
		enum: SelectFilter,

		//binary
		binary: BinaryFilter,
		varbinary: BinaryFilter,
		blob: BinaryFilter,
		tinyblob: BinaryFilter,
		mediumblob: BinaryFilter,
		longblob: BinaryFilter,

		//etc
		set: TextFilter, //(text)

		'foreign key': ForeignKeyFilter,
	},

	oracledb: {
		// numbers (number)
		NUMBER: NumberFilter,
		FLOAT: NumberFilter,
		BINARY_FLOAT: NumberFilter,
		BINARY_DOUBLE: NumberFilter,
		'INTERVAL YEAR': NumberFilter,
		'INTERVAL DAY': NumberFilter,

		//datetime (datepicker)
		DATE: DateFilter,
		TIMESTAMP: DateTimeFilter,

		// short text (text)
		CHAR: TextFilter,
		NCHAR: TextFilter,
		CLOB: TextFilter,
		NCLOB: TextFilter,
		VARCHAR2: TextFilter,
		VARCHAR: TextFilter,
		NVARCHAR2: TextFilter,

		//binary
		BLOB: BinaryFilter,
		BFILE: BinaryFilter,
		RAW: BinaryFilter,
		'LONG RAW': BinaryFilter,
		LONG: BinaryFilter,

		'foreign key': ForeignKeyFilter,
	},

	mssql: {
		// numbers (number)
		bigint: NumberFilter,
		int: NumberFilter,
		smallint: NumberFilter,
		tinyint: NumberFilter,
		decimal: NumberFilter,
		bitdecimal: NumberFilter,
		numeric: NumberFilter,
		real: NumberFilter,

		// short text (text)
		uniqueidentifier: IdFilter,
		char: TextFilter,
		varchar: TextFilter,

		//long text (textarea)
		text: LongTextFilter,
		nchar: LongTextFilter,
		nvarchar: LongTextFilter,
		ntext: LongTextFilter,

		//datetime (datepicker)
		date: DateFilter,
		datetime: DateTimeFilter,
		smalldatetime: DateTimeFilter,
		timestamp: DateTimeFilter,

		//binary
		binary: BinaryFilter,
		varbinary: BinaryFilter,
		image: BinaryFilter,

		// etc
		money: TextFilter,
		smallmoney: TextFilter,

		'foreign key': ForeignKeyFilter,
	},
	mongodb: {
		// numbers (number)
		number: NumberFilter,
		double: NumberFilter,
		int32: NumberFilter,
		long: NumberFilter,
		decimal128: NumberFilter,

		//boolean (radiogroup)
		boolean: BooleanFilter,

		//datetime (datepicker)
		date: DateFilter,
		timestamp: DateTimeFilter,

		// short text (text)
		string: TextFilter,
		regexp: TextFilter,
		objectid: TextFilter,

		//binary
		binary: BinaryFilter,

		//json
		//json
		object: JsonEditorFilter,
		array: JsonEditorFilter,

		'foreign key': ForeignKeyFilter,
	},
	dynamodb: {
		string: TextFilter,
		number: NumberFilter,
		boolean: BooleanFilter,
		null: StaticTextFilter,
		array: JsonEditorFilter,
		json: JsonEditorFilter,
		binary: BinaryFilter,
	},
	cassandra: {
		int: NumberFilter,
		bigint: NumberFilter,
		varint: NumberFilter,
		decimal: NumberFilter,
		float: NumberFilter,
		double: NumberFilter,

		boolean: BooleanFilter,

		timeuuid: IdFilter,

		timestamp: DateTimeFilter,
		date: DateFilter,
		time: TimeFilter,

		uuid: TextFilter,
		varchar: TextFilter,
		inet: TextFilter,
		ascii: TextFilter,
		text: TextFilter,

		//binary
		blob: BinaryFilter,

		list: JsonEditorFilter,
		map: JsonEditorFilter,
		set: JsonEditorFilter,
	},
};
