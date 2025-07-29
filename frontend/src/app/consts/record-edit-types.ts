import { BinaryDataCaptionEditComponent } from '../components/ui-components/record-edit-fields/binary-data-caption/binary-data-caption.component';
import { BooleanEditComponent } from 'src/app/components/ui-components/record-edit-fields/boolean/boolean.component'
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
import { LongTextEditComponent } from 'src/app/components/ui-components/record-edit-fields/long-text/long-text.component'
import { MoneyEditComponent } from '../components/ui-components/record-edit-fields/money/money.component';
import { NumberEditComponent } from 'src/app/components/ui-components/record-edit-fields/number/number.component';
import { PasswordEditComponent } from '../components/ui-components/record-edit-fields/password/password.component';
import { PhoneEditComponent } from '../components/ui-components/record-edit-fields/phone/phone.component';
import { PointEditComponent } from 'src/app/components/ui-components/record-edit-fields/point/point.component';
import { SelectEditComponent } from '../components/ui-components/record-edit-fields/select/select.component';
import { StaticTextEditComponent } from '../components/ui-components/record-edit-fields/static-text/static-text.component';
import { TextEditComponent } from 'src/app/components/ui-components/record-edit-fields/text/text.component';
import { TimeEditComponent } from '../components/ui-components/record-edit-fields/time/time.component';
import { TimeIntervalEditComponent } from '../components/ui-components/record-edit-fields/time-interval/time-interval.component';
import { UrlEditComponent } from '../components/ui-components/record-edit-fields/url/url.component';

export const timestampTypes = ['timestamp without time zone', 'timestamp with time zone', 'timestamp', 'date', 'time without time zone', 'time with time zone' , 'time', 'datetime', 'date time', 'datetime2', 'datetimeoffset', 'curdate', 'curtime', 'now', 'localtime', 'localtimestamp'];
export const defaultTimestampValues = {
    postgres: ['current_date', 'current_time', 'current_timestamp', 'localtime', 'localtimestamp', 'now'],
    mysql: ['curdate', 'curtime', 'now'],
}

export const UIwidgets = {
    Default: '',
    Boolean: BooleanEditComponent,
    Date: DateEditComponent,
    Time: TimeEditComponent,
    DateTime: DateTimeEditComponent,
    JSON: JsonEditorEditComponent,
    Textarea: LongTextEditComponent,
    String: TextEditComponent,
    Readonly: StaticTextEditComponent,
    Number: NumberEditComponent,
    Select: SelectEditComponent,
    Password: PasswordEditComponent,
    File: FileEditComponent,
    Code: CodeEditComponent,
    Image: ImageEditComponent,
    URL: UrlEditComponent,
    Country: CountryEditComponent,
    Phone: PhoneEditComponent,
    Money: MoneyEditComponent,
    Foreign_key: ForeignKeyEditComponent,
    Color: ColorEditComponent,
}

export const recordEditTypes = {
    postgres: {
        // numbers (number)
        real: NumberEditComponent,
        "double precision": NumberEditComponent,
        smallint: NumberEditComponent,
        integer: NumberEditComponent,
        bigint: NumberEditComponent,
        numeric: NumberEditComponent,

        //boolean (checkbox)
        boolean: BooleanEditComponent,

        //datetime (datepicker)
        "timestamp without time zone": DateTimeEditComponent,
        "timestamp with time zone": DateTimeEditComponent,
        "time without time zone": TimeEditComponent,
        "time with time zone": TimeEditComponent,
        date: DateEditComponent,
        abstime: DateTimeEditComponent,
        realtime: DateTimeEditComponent,
        interval: TimeIntervalEditComponent, // number + select(seconds, days, weeks, years)

        // short text (text)
        "character varying": TextEditComponent,
        macaddr: TextEditComponent, //to do regexp
        macaddr8: TextEditComponent, //to do regexp
        cidr: TextEditComponent, //to do regexp
        inet: TextEditComponent, //to do regexp
        uuid: TextEditComponent, //to do regexp

        //long text (textarea)
        text: LongTextEditComponent,
        xml: LongTextEditComponent,

        //select (select)
        enum: SelectEditComponent,

        // json-editor
        json: JsonEditorEditComponent, //json-editor
        jsonb: JsonEditorEditComponent, //json-editor
        ARRAY: JsonEditorEditComponent,

        //file
        bytea: FileEditComponent,

        //etc
        money: MoneyEditComponent,

        //mess (math)
        point: PointEditComponent,
        line: TextEditComponent,
        circle: TextEditComponent,
        path: TextEditComponent,
        box: TextEditComponent,
        lseg: TextEditComponent,

        "foreign key": ForeignKeyEditComponent
    },

    mysql: {
        // numbers (number)
        tinyint: NumberEditComponent,
        smallint:  NumberEditComponent,
        mediumint:  NumberEditComponent,
        int:  NumberEditComponent,
        bigint:  NumberEditComponent,
        decimal: NumberEditComponent,
        float:  NumberEditComponent,
        double:  NumberEditComponent,
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

        //file
        binary: FileEditComponent,
        varbinary: FileEditComponent,
        blob: FileEditComponent,
        tinyblob: FileEditComponent,
        mediumblob: FileEditComponent,
        longblob: FileEditComponent,

        //etc
        set: TextEditComponent, //(text)

        "foreign key": ForeignKeyEditComponent
    },

    oracledb: {
        // numbers (number)
        NUMBER: NumberEditComponent,
        FLOAT: NumberEditComponent,
        BINARY_FLOAT: NumberEditComponent,
        BINARY_DOUBLE: NumberEditComponent,
        "INTERVAL YEAR": NumberEditComponent,
        "INTERVAL DAY": NumberEditComponent,

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

        //file
        BLOB: FileEditComponent,
        BFILE: FileEditComponent,
        RAW: FileEditComponent,
        "LONG RAW" : FileEditComponent,
        LONG : FileEditComponent,

        "foreign key": ForeignKeyEditComponent
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
        uniqueidentifier: IdEditComponent,
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

        //file
        binary: FileEditComponent,
        varbinary: FileEditComponent,
        image: FileEditComponent,

        // etc
        money: MoneyEditComponent,
        smallmoney: MoneyEditComponent,

        "foreign key": ForeignKeyEditComponent
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

        //file
        binary: FileEditComponent,

        //json
        object: JsonEditorEditComponent,
        array: JsonEditorEditComponent,

        //etc
        unknown: TextEditComponent,

        "foreign key": ForeignKeyEditComponent
    },
    dynamodb: {
        string: TextEditComponent,
        number: NumberEditComponent,
        boolean: BooleanEditComponent,
        null: StaticTextEditComponent,
        array: JsonEditorEditComponent,
        json: JsonEditorEditComponent,
        binary: FileEditComponent,
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

        uuid: TextEditComponent,
        varchar: TextEditComponent,
        inet: TextEditComponent,
        ascii: TextEditComponent,
        text: LongTextEditComponent,

        list: JsonEditorEditComponent,
        map: JsonEditorEditComponent,
        set: JsonEditorEditComponent,
    }
}
