import { BooleanRecordViewComponent } from 'src/app/components/ui-components/record-view-fields/boolean/boolean.component';
import { CodeRecordViewComponent } from '../components/ui-components/record-view-fields/code/code.component';
import { ColorRecordViewComponent } from '../components/ui-components/record-view-fields/color/color.component';
import { CountryRecordViewComponent } from '../components/ui-components/record-view-fields/country/country.component';
import { DateRecordViewComponent } from '../components/ui-components/record-view-fields/date/date.component';
import { DateTimeRecordViewComponent } from '../components/ui-components/record-view-fields/date-time/date-time.component';
import { FileRecordViewComponent } from '../components/ui-components/record-view-fields/file/file.component';
import { ForeignKeyRecordViewComponent } from '../components/ui-components/record-view-fields/foreign-key/foreign-key.component';
import { IdRecordViewComponent } from '../components/ui-components/record-view-fields/id/id.component';
import { ImageRecordViewComponent } from '../components/ui-components/record-view-fields/image/image.component';
import { JsonEditorRecordViewComponent } from '../components/ui-components/record-view-fields/json-editor/json-editor.component';
import { LongTextRecordViewComponent } from 'src/app/components/ui-components/record-view-fields/long-text/long-text.component';
import { MarkdownRecordViewComponent } from '../components/ui-components/record-view-fields/markdown/markdown.component';
import { MoneyRecordViewComponent } from '../components/ui-components/record-view-fields/money/money.component';
import { NumberRecordViewComponent } from '../components/ui-components/record-view-fields/number/number.component';
import { PasswordRecordViewComponent } from '../components/ui-components/record-view-fields/password/password.component';
import { PhoneRecordViewComponent } from '../components/ui-components/record-view-fields/phone/phone.component';
import { PointRecordViewComponent } from '../components/ui-components/record-view-fields/point/point.component';
import { RangeRecordViewComponent } from '../components/ui-components/record-view-fields/range/range.component';
import { SelectRecordViewComponent } from '../components/ui-components/record-view-fields/select/select.component';
import { StaticTextRecordViewComponent } from '../components/ui-components/record-view-fields/static-text/static-text.component';
import { TextRecordViewComponent } from 'src/app/components/ui-components/record-view-fields/text/text.component';
import { TimeIntervalRecordViewComponent } from '../components/ui-components/record-view-fields/time-interval/time-interval.component';
import { TimeRecordViewComponent } from '../components/ui-components/record-view-fields/time/time.component';
import { TimezoneRecordViewComponent } from '../components/ui-components/record-view-fields/timezone/timezone.component';
import { UrlRecordViewComponent } from '../components/ui-components/record-view-fields/url/url.component';
import { UuidRecordViewComponent } from '../components/ui-components/record-view-fields/uuid/uuid.component';

export const UIwidgets = {
    Default: '',
    Boolean: BooleanRecordViewComponent,
    Date: DateRecordViewComponent,
    Time: TimeRecordViewComponent,
    DateTime: DateTimeRecordViewComponent,
    JSON: JsonEditorRecordViewComponent,
    Markdown: MarkdownRecordViewComponent,
    Textarea: LongTextRecordViewComponent,
    String: TextRecordViewComponent,
    Readonly: StaticTextRecordViewComponent,
    Number: NumberRecordViewComponent,
    Select: SelectRecordViewComponent,
    Password: PasswordRecordViewComponent,
    File: FileRecordViewComponent,
    Code: CodeRecordViewComponent,
    Image: ImageRecordViewComponent,
    URL: UrlRecordViewComponent,
    Country: CountryRecordViewComponent,
    Phone: PhoneRecordViewComponent,
    Money: MoneyRecordViewComponent,
    Foreign_key: ForeignKeyRecordViewComponent,
    Color: ColorRecordViewComponent,
    UUID: UuidRecordViewComponent,
    Range: RangeRecordViewComponent,
    Timezone: TimezoneRecordViewComponent
}

export const recordViewFieldTypes = {
    postgres: {
        // numbers (number)
        real: NumberRecordViewComponent,
        "double precision": NumberRecordViewComponent,
        smallint: NumberRecordViewComponent,
        integer: NumberRecordViewComponent,
        bigint: NumberRecordViewComponent,
        numeric: NumberRecordViewComponent,

        //boolean (checkbox)
        boolean: BooleanRecordViewComponent,

        //datetime (datepicker)
        "timestamp without time zone": DateTimeRecordViewComponent,
        "timestamp with time zone": DateTimeRecordViewComponent,
        "time without time zone": TimeRecordViewComponent,
        "time with time zone": TimeRecordViewComponent,
        date: DateRecordViewComponent,
        abstime: DateTimeRecordViewComponent,
        realtime: DateTimeRecordViewComponent,
        interval: TimeIntervalRecordViewComponent,

        // short text (text)
        "character varying": TextRecordViewComponent,
        macaddr: TextRecordViewComponent,
        macaddr8: TextRecordViewComponent,
        cidr: TextRecordViewComponent,
        inet: TextRecordViewComponent,
        uuid: UuidRecordViewComponent,

        //long text (textarea)
        text: LongTextRecordViewComponent,
        xml: LongTextRecordViewComponent,

        //select (select)
        enum: SelectRecordViewComponent,

        // json-editor
        json: JsonEditorRecordViewComponent,
        jsonb: JsonEditorRecordViewComponent,
        ARRAY: JsonEditorRecordViewComponent,

        //file
        bytea: FileRecordViewComponent,

        //etc
        money: MoneyRecordViewComponent,

        //mess (math)
        point: PointRecordViewComponent,
        line: TextRecordViewComponent,
        circle: TextRecordViewComponent,
        path: TextRecordViewComponent,
        box: TextRecordViewComponent,
        lseg: TextRecordViewComponent,

        "foreign key": ForeignKeyRecordViewComponent
    },

    mysql: {
        // numbers (number)
        tinyint: NumberRecordViewComponent,
        smallint:  NumberRecordViewComponent,
        mediumint:  NumberRecordViewComponent,
        int:  NumberRecordViewComponent,
        bigint:  NumberRecordViewComponent,
        decimal: NumberRecordViewComponent,
        float:  NumberRecordViewComponent,
        double:  NumberRecordViewComponent,
        year: NumberRecordViewComponent,

        //boolean (radiogroup)
        boolean: BooleanRecordViewComponent,

        //datetime (datepicker)
        date: DateRecordViewComponent,
        time: TimeRecordViewComponent,
        datetime: DateTimeRecordViewComponent,
        timestamp: DateTimeRecordViewComponent,

        // short text (text)
        char: TextRecordViewComponent,
        varchar: TextRecordViewComponent,

        //long text (textarea)
        text: LongTextRecordViewComponent,
        tinytext: LongTextRecordViewComponent,
        mediumtext: LongTextRecordViewComponent,
        longtext: LongTextRecordViewComponent,

        json: JsonEditorRecordViewComponent, //json-editor

        //select (select)
        enum: SelectRecordViewComponent,

        //file
        binary: FileRecordViewComponent,
        varbinary: FileRecordViewComponent,
        blob: FileRecordViewComponent,
        tinyblob: FileRecordViewComponent,
        mediumblob: FileRecordViewComponent,
        longblob: FileRecordViewComponent,

        //etc
        set: TextRecordViewComponent,

        "foreign key": ForeignKeyRecordViewComponent
    },

    oracledb: {
        // numbers (number)
        NUMBER: NumberRecordViewComponent,
        FLOAT: NumberRecordViewComponent,
        BINARY_FLOAT: NumberRecordViewComponent,
        BINARY_DOUBLE: NumberRecordViewComponent,
        "INTERVAL YEAR": NumberRecordViewComponent,
        "INTERVAL DAY": NumberRecordViewComponent,

        //datetime (datepicker)
        DATE: DateRecordViewComponent,
        TIMESTAMP: DateTimeRecordViewComponent,

        // short text (text)
        CHAR: TextRecordViewComponent,
        NCHAR: TextRecordViewComponent,
        CLOB: TextRecordViewComponent,
        NCLOB: TextRecordViewComponent,
        VARCHAR2: TextRecordViewComponent,
        VARCHAR: TextRecordViewComponent,
        NVARCHAR2: TextRecordViewComponent,

        //file
        BLOB: FileRecordViewComponent,
        BFILE: FileRecordViewComponent,
        RAW: FileRecordViewComponent,
        "LONG RAW": FileRecordViewComponent,
        LONG: FileRecordViewComponent,

        "foreign key": ForeignKeyRecordViewComponent
    },

    mssql: {
        // numbers (number)
        bigint: NumberRecordViewComponent,
        int: NumberRecordViewComponent,
        smallint: NumberRecordViewComponent,
        tinyint: NumberRecordViewComponent,
        decimal: NumberRecordViewComponent,
        bitdecimal: NumberRecordViewComponent,
        numeric: NumberRecordViewComponent,
        real: NumberRecordViewComponent,

        // short text (text)
        uniqueidentifier: UuidRecordViewComponent,
        char: TextRecordViewComponent,
        varchar: TextRecordViewComponent,

        //long text (textarea)
        text: LongTextRecordViewComponent,
        nchar: LongTextRecordViewComponent,
        nvarchar: LongTextRecordViewComponent,
        ntext: LongTextRecordViewComponent,

        //datetime (datepicker)
        date: DateRecordViewComponent,
        datetime: DateTimeRecordViewComponent,
        smalldatetime: DateTimeRecordViewComponent,
        timestamp: DateTimeRecordViewComponent,

        //file
        binary: FileRecordViewComponent,
        varbinary: FileRecordViewComponent,
        image: ImageRecordViewComponent,

        // etc
        money: MoneyRecordViewComponent,
        smallmoney: MoneyRecordViewComponent,

        "foreign key": ForeignKeyRecordViewComponent
    },
    mongodb: {
        // numbers (number)
        number: NumberRecordViewComponent,
        double: NumberRecordViewComponent,
        int32: NumberRecordViewComponent,
        long: NumberRecordViewComponent,
        decimal128: NumberRecordViewComponent,

        //boolean (radiogroup)
        boolean: BooleanRecordViewComponent,

        //datetime (datepicker)
        date: DateRecordViewComponent,
        timestamp: DateTimeRecordViewComponent,

        // short text (text)
        string: TextRecordViewComponent,
        regexp: TextRecordViewComponent,
        objectid: TextRecordViewComponent,

        //file
        binary: FileRecordViewComponent,

        //json
        object: JsonEditorRecordViewComponent,
        array: JsonEditorRecordViewComponent,

        //etc
        unknown: TextRecordViewComponent,

        "foreign key": ForeignKeyRecordViewComponent
    },
    dynamodb: {
        string: TextRecordViewComponent,
        number: NumberRecordViewComponent,
        boolean: BooleanRecordViewComponent,
        null: StaticTextRecordViewComponent,
        array: JsonEditorRecordViewComponent,
        json: JsonEditorRecordViewComponent,
        binary: FileRecordViewComponent,
    },
    cassandra: {
        int: NumberRecordViewComponent,
        bigint: NumberRecordViewComponent,
        varint: NumberRecordViewComponent,
        decimal: NumberRecordViewComponent,
        float: NumberRecordViewComponent,
        double: NumberRecordViewComponent,

        boolean: BooleanRecordViewComponent,

        timeuuid: IdRecordViewComponent,

        timestamp: DateTimeRecordViewComponent,
        date: DateRecordViewComponent,
        time: TimeRecordViewComponent,

        uuid: UuidRecordViewComponent,
        varchar: TextRecordViewComponent,
        inet: TextRecordViewComponent,
        ascii: TextRecordViewComponent,
        text: LongTextRecordViewComponent,

        list: JsonEditorRecordViewComponent,
        map: JsonEditorRecordViewComponent,
        set: JsonEditorRecordViewComponent,
    },
}
