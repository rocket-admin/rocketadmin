import { BooleanEditComponent } from 'src/app/components/ui-components/record-edit-fields/boolean/boolean.component';
import { LongTextEditComponent } from 'src/app/components/ui-components/record-edit-fields/long-text/long-text.component';
import { NumberEditComponent } from 'src/app/components/ui-components/record-edit-fields/number/number.component';
import { PointEditComponent } from 'src/app/components/ui-components/record-edit-fields/point/point.component';
import { TextEditComponent } from 'src/app/components/ui-components/record-edit-fields/text/text.component';
import { BinaryEditComponent } from '../components/ui-components/record-edit-fields/binary/binary.component';
import { CodeEditComponent } from '../components/ui-components/record-edit-fields/code/code.component';
import { ColorEditComponent } from '../components/ui-components/record-edit-fields/color/color.component';
import { CountryEditComponent } from '../components/ui-components/record-edit-fields/country/country.component';
import { DateEditComponent } from '../components/ui-components/record-edit-fields/date/date.component';
import { DateTimeEditComponent } from '../components/ui-components/record-edit-fields/date-time/date-time.component';
import { FileEditComponent } from '../components/ui-components/record-edit-fields/file/file.component';
import { ForeignKeyEditComponent } from '../components/ui-components/record-edit-fields/foreign-key/foreign-key.component';
import { IdEditComponent } from '../components/ui-components/record-edit-fields/id/id.component';
import { ImageEditComponent } from '../components/ui-components/record-edit-fields/image/image.component';
import { JsonEditorEditComponent } from '../components/ui-components/record-edit-fields/json-editor/json-editor.component';
import { LanguageEditComponent } from '../components/ui-components/record-edit-fields/language/language.component';
import { MarkdownEditComponent } from '../components/ui-components/record-edit-fields/markdown/markdown.component';
import { MoneyEditComponent } from '../components/ui-components/record-edit-fields/money/money.component';
import { PasswordEditComponent } from '../components/ui-components/record-edit-fields/password/password.component';
import { PhoneEditComponent } from '../components/ui-components/record-edit-fields/phone/phone.component';
import { RangeEditComponent } from '../components/ui-components/record-edit-fields/range/range.component';
import { S3EditComponent } from '../components/ui-components/record-edit-fields/s3/s3.component';
import { SelectEditComponent } from '../components/ui-components/record-edit-fields/select/select.component';
import { StaticTextEditComponent } from '../components/ui-components/record-edit-fields/static-text/static-text.component';
import { TimeEditComponent } from '../components/ui-components/record-edit-fields/time/time.component';
import { TimeIntervalEditComponent } from '../components/ui-components/record-edit-fields/time-interval/time-interval.component';
import { TimezoneEditComponent } from '../components/ui-components/record-edit-fields/timezone/timezone.component';
import { UrlEditComponent } from '../components/ui-components/record-edit-fields/url/url.component';
import { UuidEditComponent } from '../components/ui-components/record-edit-fields/uuid/uuid.component';

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
	Boolean: BooleanEditComponent,
	Code: CodeEditComponent,
	Color: ColorEditComponent,
	Country: CountryEditComponent,
	Date: DateEditComponent,
	DateTime: DateTimeEditComponent,
	Binary: BinaryEditComponent,
	File: FileEditComponent,
	Foreign_key: ForeignKeyEditComponent,
	Image: ImageEditComponent,
	JSON: JsonEditorEditComponent,
	Language: LanguageEditComponent,
	Markdown: MarkdownEditComponent,
	Money: MoneyEditComponent,
	Number: NumberEditComponent,
	Password: PasswordEditComponent,
	Phone: PhoneEditComponent,
	Range: RangeEditComponent,
	Readonly: StaticTextEditComponent,
	Select: SelectEditComponent,
	String: TextEditComponent,
	Textarea: LongTextEditComponent,
	Time: TimeEditComponent,
	Timezone: TimezoneEditComponent,
	URL: UrlEditComponent,
	UUID: UuidEditComponent,
	S3: S3EditComponent,
	Email: TextEditComponent,
};

export const recordEditTypes = {
	postgres: {
		// numbers (number)
		real: NumberEditComponent,
		'double precision': NumberEditComponent,
		smallint: NumberEditComponent,
		integer: NumberEditComponent,
		bigint: NumberEditComponent,
		numeric: NumberEditComponent,

		//boolean (checkbox)
		boolean: BooleanEditComponent,

		//datetime (datepicker)
		'timestamp without time zone': DateTimeEditComponent,
		'timestamp with time zone': DateTimeEditComponent,
		'time without time zone': TimeEditComponent,
		'time with time zone': TimeEditComponent,
		date: DateEditComponent,
		abstime: DateTimeEditComponent,
		realtime: DateTimeEditComponent,
		interval: TimeIntervalEditComponent, // number + select(seconds, days, weeks, years)

		// short text (text)
		'character varying': TextEditComponent,
		macaddr: TextEditComponent, //to do regexp
		macaddr8: TextEditComponent, //to do regexp
		cidr: TextEditComponent, //to do regexp
		inet: TextEditComponent, //to do regexp
		uuid: UuidEditComponent,

		//long text (textarea)
		text: LongTextEditComponent,
		xml: LongTextEditComponent,

		//select (select)
		enum: SelectEditComponent,

		// json-editor
		json: JsonEditorEditComponent, //json-editor
		jsonb: JsonEditorEditComponent, //json-editor
		ARRAY: JsonEditorEditComponent,

		//binary
		bytea: BinaryEditComponent,

		//etc
		money: MoneyEditComponent,

		//mess (math)
		point: PointEditComponent,
		line: TextEditComponent,
		circle: TextEditComponent,
		path: TextEditComponent,
		box: TextEditComponent,
		lseg: TextEditComponent,

		'foreign key': ForeignKeyEditComponent,
	},

	mysql: {
		// numbers (number)
		tinyint: NumberEditComponent,
		smallint: NumberEditComponent,
		mediumint: NumberEditComponent,
		int: NumberEditComponent,
		bigint: NumberEditComponent,
		decimal: NumberEditComponent,
		float: NumberEditComponent,
		double: NumberEditComponent,
		year: NumberEditComponent,

		//boolean (radiogroup)
		boolean: BooleanEditComponent,

		//datetime (datepicker)
		date: DateEditComponent,
		time: TimeEditComponent,
		datetime: DateTimeEditComponent,
		timestamp: DateTimeEditComponent,

		// short text (text)
		char: TextEditComponent,
		varchar: TextEditComponent,

		//long text (textarea)
		text: LongTextEditComponent,
		tinytext: LongTextEditComponent,
		mediumtext: LongTextEditComponent,
		longtext: LongTextEditComponent,

		json: JsonEditorEditComponent, //json-editor

		//select (select)
		enum: SelectEditComponent,

		//binary
		binary: BinaryEditComponent,
		varbinary: BinaryEditComponent,
		blob: BinaryEditComponent,
		tinyblob: BinaryEditComponent,
		mediumblob: BinaryEditComponent,
		longblob: BinaryEditComponent,

		//etc
		set: TextEditComponent, //(text)

		'foreign key': ForeignKeyEditComponent,
	},

	oracledb: {
		// numbers (number)
		NUMBER: NumberEditComponent,
		FLOAT: NumberEditComponent,
		BINARY_FLOAT: NumberEditComponent,
		BINARY_DOUBLE: NumberEditComponent,
		'INTERVAL YEAR': NumberEditComponent,
		'INTERVAL DAY': NumberEditComponent,

		//datetime (datepicker)
		DATE: DateEditComponent,
		TIMESTAMP: DateTimeEditComponent,

		// short text (text)
		CHAR: TextEditComponent,
		NCHAR: TextEditComponent,
		CLOB: TextEditComponent,
		NCLOB: TextEditComponent,
		VARCHAR2: TextEditComponent,
		VARCHAR: TextEditComponent,
		NVARCHAR2: TextEditComponent,

		//binary
		BLOB: BinaryEditComponent,
		BFILE: BinaryEditComponent,
		RAW: BinaryEditComponent,
		'LONG RAW': BinaryEditComponent,
		LONG: BinaryEditComponent,

		'foreign key': ForeignKeyEditComponent,
	},

	mssql: {
		// numbers (number)
		bigint: NumberEditComponent,
		int: NumberEditComponent,
		smallint: NumberEditComponent,
		tinyint: NumberEditComponent,
		decimal: NumberEditComponent,
		bitdecimal: NumberEditComponent,
		numeric: NumberEditComponent,
		real: NumberEditComponent,

		// short text (text)
		uniqueidentifier: UuidEditComponent,
		char: TextEditComponent,
		varchar: TextEditComponent,

		//long text (textarea)
		text: LongTextEditComponent,
		nchar: LongTextEditComponent,
		nvarchar: LongTextEditComponent,
		ntext: LongTextEditComponent,

		//datetime (datepicker)
		date: DateEditComponent,
		datetime: DateTimeEditComponent,
		smalldatetime: DateTimeEditComponent,
		timestamp: DateTimeEditComponent,

		//binary
		binary: BinaryEditComponent,
		varbinary: BinaryEditComponent,
		image: BinaryEditComponent,

		// etc
		money: MoneyEditComponent,
		smallmoney: MoneyEditComponent,

		'foreign key': ForeignKeyEditComponent,
	},
	mongodb: {
		// numbers (number)
		number: NumberEditComponent,
		double: NumberEditComponent,
		int32: NumberEditComponent,
		long: NumberEditComponent,
		decimal128: NumberEditComponent,

		//boolean (radiogroup)
		boolean: BooleanEditComponent,

		//datetime (datepicker)
		date: DateEditComponent,
		timestamp: DateTimeEditComponent,

		// short text (text)
		string: TextEditComponent,
		regexp: TextEditComponent,
		objectid: TextEditComponent,

		//binary
		binary: BinaryEditComponent,

		//json
		object: JsonEditorEditComponent,
		array: JsonEditorEditComponent,

		//etc
		unknown: TextEditComponent,

		'foreign key': ForeignKeyEditComponent,
	},
	dynamodb: {
		string: TextEditComponent,
		number: NumberEditComponent,
		boolean: BooleanEditComponent,
		null: StaticTextEditComponent,
		array: JsonEditorEditComponent,
		json: JsonEditorEditComponent,
		binary: BinaryEditComponent,
	},
	cassandra: {
		int: NumberEditComponent,
		bigint: NumberEditComponent,
		varint: NumberEditComponent,
		decimal: NumberEditComponent,
		float: NumberEditComponent,
		double: NumberEditComponent,

		boolean: BooleanEditComponent,

		timeuuid: IdEditComponent,

		timestamp: DateTimeEditComponent,
		date: DateEditComponent,
		time: TimeEditComponent,

		uuid: UuidEditComponent,
		varchar: TextEditComponent,
		inet: TextEditComponent,
		ascii: TextEditComponent,
		text: TextEditComponent,

		list: JsonEditorEditComponent,
		map: JsonEditorEditComponent,
		set: JsonEditorEditComponent,
	},
	redis: {
		string: TextEditComponent,
		integer: NumberEditComponent,
		decimal: NumberEditComponent,
		boolean: BooleanEditComponent,
		array: JsonEditorEditComponent,
		json: JsonEditorEditComponent,
	},
	elasticsearch: {
		string: TextEditComponent,
		number: NumberEditComponent,
		boolean: BooleanEditComponent,
		date: DateEditComponent,
		object: JsonEditorEditComponent,
		array: JsonEditorEditComponent,
		binary: BinaryEditComponent,
	},
	clickhouse: {
		string: TextEditComponent,
		uuid: UuidEditComponent,
		boolean: BooleanEditComponent,
		integer: NumberEditComponent,
		bigint: NumberEditComponent,
		float: NumberEditComponent,
		double: NumberEditComponent,
		decimal: NumberEditComponent,
		date: DateEditComponent,
		datetime: DateTimeEditComponent,
		json: JsonEditorEditComponent,
		object: JsonEditorEditComponent,
		array: JsonEditorEditComponent,
	},
};
