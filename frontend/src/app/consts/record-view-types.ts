import { BinaryDataCaptionViewComponent } from '../components/ui-components/record-view-fields/binary-data-caption/binary-data-caption.component';
import { BooleanViewComponent } from 'src/app/components/ui-components/record-view-fields/boolean/boolean.component'
import { CodeViewComponent } from '../components/ui-components/record-view-fields/code/code.component';
import { CountryViewComponent } from '../components/ui-components/record-view-fields/country/country.component';
import { DateTimeViewComponent } from '../components/ui-components/record-view-fields/date-time/date-time.component';
import { DateViewComponent } from '../components/ui-components/record-view-fields/date/date.component';
import { FileViewComponent } from '../components/ui-components/record-view-fields/file/file.component';
import { ForeignKeyViewComponent } from '../components/ui-components/record-view-fields/foreign-key/foreign-key.component';
import { IdViewComponent } from '../components/ui-components/record-view-fields/id/id.component';
import { ImageViewComponent } from '../components/ui-components/record-view-fields/image/image.component';
import { JsonEditorViewComponent } from '../components/ui-components/record-view-fields/json-editor/json-editor.component';
import { LongTextViewComponent } from 'src/app/components/ui-components/record-view-fields/long-text/long-text.component'
import { MoneyViewComponent } from '../components/ui-components/record-view-fields/money/money.component';
import { NumberViewComponent } from 'src/app/components/ui-components/record-view-fields/number/number.component';
import { PasswordViewComponent } from '../components/ui-components/record-view-fields/password/password.component';
import { PhoneViewComponent } from '../components/ui-components/record-view-fields/phone/phone.component';
import { PointViewComponent } from 'src/app/components/ui-components/record-view-fields/point/point.component';
import { SelectViewComponent } from '../components/ui-components/record-view-fields/select/select.component';
import { StaticTextViewComponent } from '../components/ui-components/record-view-fields/static-text/static-text.component';
import { TextViewComponent } from 'src/app/components/ui-components/record-view-fields/text/text.component';
import { TimeIntervalViewComponent } from '../components/ui-components/record-view-fields/time-interval/time-interval.component';
import { TimeViewComponent } from '../components/ui-components/record-view-fields/time/time.component';
import { UrlViewComponent } from '../components/ui-components/record-view-fields/url/url.component';

export const UIwidgets = {
    Default: '',
    Boolean: BooleanViewComponent,
    Date: DateViewComponent,
    Time: TimeViewComponent,
    DateTime: DateTimeViewComponent,
    JSON: JsonEditorViewComponent,
    Textarea: LongTextViewComponent,
    String: TextViewComponent,
    Readonly: StaticTextViewComponent,
    Number: NumberViewComponent,
    Select: SelectViewComponent,
    Password: PasswordViewComponent,
    File: FileViewComponent,
    Code: CodeViewComponent,
    Image: ImageViewComponent,
    URL: UrlViewComponent,
    Country: CountryViewComponent,
    Phone: PhoneViewComponent,
    Money: MoneyViewComponent,
    Foreign_key: ForeignKeyViewComponent,
}

export const recordViewTypes = {
    postgres: {
        // numbers (number)
        real: NumberViewComponent,
        "double precision": NumberViewComponent,
        smallint: NumberViewComponent,
        integer: NumberViewComponent,
        bigint: NumberViewComponent,
        numeric: NumberViewComponent,

        //boolean (checkbox)
        boolean: BooleanViewComponent,

        //datetime (datepicker)
        "timestamp without time zone": DateTimeViewComponent,
        "timestamp with time zone": DateTimeViewComponent,
        "time without time zone": TimeViewComponent,
        "time with time zone": TimeViewComponent,
        date: DateViewComponent,
        abstime: DateTimeViewComponent,
        realtime: DateTimeViewComponent,
        interval: TimeIntervalViewComponent,

        // short text (text)
        "character varying": TextViewComponent,
        macaddr: TextViewComponent,
        macaddr8: TextViewComponent,
        cidr: TextViewComponent,
        inet: TextViewComponent,
        uuid: TextViewComponent,

        //long text (textarea)
        text: LongTextViewComponent,
        xml: LongTextViewComponent,

        //select (select)
        enum: SelectViewComponent,

        // json-editor
        json: JsonEditorViewComponent,
        jsonb: JsonEditorViewComponent,
        ARRAY: JsonEditorViewComponent,

        //file
        bytea: FileViewComponent,

        //etc
        money: MoneyViewComponent,

        //mess (math)
        point: PointViewComponent,
        line: TextViewComponent,
        circle: TextViewComponent,
        path: TextViewComponent,
        box: TextViewComponent,
        lseg: TextViewComponent,

        "foreign key": ForeignKeyViewComponent
    },

    mysql: {
        // numbers (number)
        tinyint: NumberViewComponent,
        smallint:  NumberViewComponent,
        mediumint:  NumberViewComponent,
        int:  NumberViewComponent,
        bigint:  NumberViewComponent,
        decimal: NumberViewComponent,
        float:  NumberViewComponent,
        double:  NumberViewComponent,
        year: NumberViewComponent,

        //boolean (radiogroup)
        boolean: BooleanViewComponent,

        //datetime (datepicker)
        date: DateViewComponent,
        time: TimeViewComponent,
        datetime: DateTimeViewComponent,
        timestamp: DateTimeViewComponent,

        // short text (text)
        char: TextViewComponent,
        varchar: TextViewComponent,

        //long text (textarea)
        text: LongTextViewComponent,
        tinytext: LongTextViewComponent,
        mediumtext: LongTextViewComponent,
        longtext: LongTextViewComponent,

        json: JsonEditorViewComponent, //json-editor

        //select (select)
        enum: SelectViewComponent,

        //file
        binary: FileViewComponent,
        varbinary: FileViewComponent,
        blob: FileViewComponent,
        tinyblob: FileViewComponent,
        mediumblob: FileViewComponent,
        longblob: FileViewComponent,

        //etc
        set: TextViewComponent,

        "foreign key": ForeignKeyViewComponent
    },

    oracledb: {
        // numbers (number)
        NUMBER: NumberViewComponent,
        FLOAT: NumberViewComponent,
        BINARY_FLOAT: NumberViewComponent,
        BINARY_DOUBLE: NumberViewComponent,
        "INTERVAL YEAR": NumberViewComponent,
        "INTERVAL DAY": NumberViewComponent,

        //datetime (datepicker)
        DATE: DateViewComponent,
        TIMESTAMP: DateTimeViewComponent,

        // short text (text)
        CHAR: TextViewComponent,
        NCHAR: TextViewComponent,
        CLOB: TextViewComponent,
        NCLOB: TextViewComponent,
        VARCHAR2: TextViewComponent,
        VARCHAR: TextViewComponent,
        NVARCHAR2: TextViewComponent,

        //file
        BLOB: FileViewComponent,
        BFILE: FileViewComponent,
        RAW: FileViewComponent,
        "LONG RAW": FileViewComponent,
        LONG: FileViewComponent,

        "foreign key": ForeignKeyViewComponent
    },

    mssql: {
        // numbers (number)
        bigint: NumberViewComponent,
        int: NumberViewComponent,
        smallint: NumberViewComponent,
        tinyint: NumberViewComponent,
        decimal: NumberViewComponent,
        bitdecimal: NumberViewComponent,
        numeric: NumberViewComponent,
        real: NumberViewComponent,

        // short text (text)
        uniqueidentifier: IdViewComponent,
        char: TextViewComponent,
        varchar: TextViewComponent,

        //long text (textarea)
        text: LongTextViewComponent,
        nchar: LongTextViewComponent,
        nvarchar: LongTextViewComponent,
        ntext: LongTextViewComponent,

        //datetime (datepicker)
        date: DateViewComponent,
        datetime: DateTimeViewComponent,
        smalldatetime: DateTimeViewComponent,
        timestamp: DateTimeViewComponent,

        //file
        binary: FileViewComponent,
        varbinary: FileViewComponent,
        image: ImageViewComponent,

        // etc
        money: MoneyViewComponent,
        smallmoney: MoneyViewComponent,

        "foreign key": ForeignKeyViewComponent
    },
    mongodb: {
        // numbers (number)
        number: NumberViewComponent,
        double: NumberViewComponent,
        int32: NumberViewComponent,
        long: NumberViewComponent,
        decimal128: NumberViewComponent,

        //boolean (radiogroup)
        boolean: BooleanViewComponent,

        //datetime (datepicker)
        date: DateViewComponent,
        timestamp: DateTimeViewComponent,

        // short text (text)
        string: TextViewComponent,
        regexp: TextViewComponent,
        objectid: TextViewComponent,

        //file
        binary: FileViewComponent,

        //json
        object: JsonEditorViewComponent,
        array: JsonEditorViewComponent,

        //etc
        unknown: TextViewComponent,

        "foreign key": ForeignKeyViewComponent
    },
    dynamodb: {
        string: TextViewComponent,
        number: NumberViewComponent,
        boolean: BooleanViewComponent,
        null: StaticTextViewComponent,
        array: JsonEditorViewComponent,
        json: JsonEditorViewComponent,
        binary: FileViewComponent,
    }
}
