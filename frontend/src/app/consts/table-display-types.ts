import { BooleanDisplayComponent } from 'src/app/components/ui-components/table-display-fields/boolean/boolean.component';
import { CodeDisplayComponent } from '../components/ui-components/table-display-fields/code/code.component';
import { ColorDisplayComponent } from '../components/ui-components/table-display-fields/color/color.component';
import { CountryDisplayComponent } from '../components/ui-components/table-display-fields/country/country.component';
import { DateDisplayComponent } from '../components/ui-components/table-display-fields/date/date.component';
import { DateTimeDisplayComponent } from '../components/ui-components/table-display-fields/date-time/date-time.component';
import { FileDisplayComponent } from '../components/ui-components/table-display-fields/file/file.component';
import { ForeignKeyDisplayComponent } from '../components/ui-components/table-display-fields/foreign-key/foreign-key.component';
import { IdDisplayComponent } from '../components/ui-components/table-display-fields/id/id.component';
import { ImageDisplayComponent } from '../components/ui-components/table-display-fields/image/image.component';
import { JsonEditorDisplayComponent } from '../components/ui-components/table-display-fields/json-editor/json-editor.component';
import { LongTextDisplayComponent } from 'src/app/components/ui-components/table-display-fields/long-text/long-text.component';
import { MoneyDisplayComponent } from '../components/ui-components/table-display-fields/money/money.component';
import { NumberDisplayComponent } from '../components/ui-components/table-display-fields/number/number.component';
import { PasswordDisplayComponent } from '../components/ui-components/table-display-fields/password/password.component';
import { PhoneDisplayComponent } from '../components/ui-components/table-display-fields/phone/phone.component';
import { PointDisplayComponent } from '../components/ui-components/table-display-fields/point/point.component';
import { SelectDisplayComponent } from '../components/ui-components/table-display-fields/select/select.component';
import { StaticTextDisplayComponent } from '../components/ui-components/table-display-fields/static-text/static-text.component';
import { TextDisplayComponent } from 'src/app/components/ui-components/table-display-fields/text/text.component';
import { TimeDisplayComponent } from '../components/ui-components/table-display-fields/time/time.component';
import { TimeIntervalDisplayComponent } from '../components/ui-components/table-display-fields/time-interval/time-interval.component';
import { UrlDisplayComponent } from '../components/ui-components/table-display-fields/url/url.component';

export const UIwidgets = {
    Default: '',
    Boolean: BooleanDisplayComponent,
    Date: DateDisplayComponent,
    Time: TimeDisplayComponent,
    DateTime: DateTimeDisplayComponent,
    JSON: JsonEditorDisplayComponent,
    Textarea: LongTextDisplayComponent,
    String: TextDisplayComponent,
    Readonly: StaticTextDisplayComponent,
    Number: NumberDisplayComponent,
    Select: SelectDisplayComponent,
    Password: PasswordDisplayComponent,
    File: FileDisplayComponent,
    Code: CodeDisplayComponent,
    Image: ImageDisplayComponent,
    URL: UrlDisplayComponent,
    Country: CountryDisplayComponent,
    Phone: PhoneDisplayComponent,
    Money: MoneyDisplayComponent,
    Foreign_key: ForeignKeyDisplayComponent,
    Color: ColorDisplayComponent,
}

export const tableDisplayTypes = {
    postgres: {
        // numbers (number)
        real: NumberDisplayComponent,
        "double precision": NumberDisplayComponent,
        smallint: NumberDisplayComponent,
        integer: NumberDisplayComponent,
        bigint: NumberDisplayComponent,
        numeric: NumberDisplayComponent,

        //boolean (checkbox)
        boolean: BooleanDisplayComponent,

        //datetime (datepicker)
        "timestamp without time zone": DateTimeDisplayComponent,
        "timestamp with time zone": DateTimeDisplayComponent,
        "time without time zone": TimeDisplayComponent,
        "time with time zone": TimeDisplayComponent,
        date: DateDisplayComponent,
        abstime: DateTimeDisplayComponent,
        realtime: DateTimeDisplayComponent,
        interval: TimeIntervalDisplayComponent,

        // short text (text)
        "character varying": TextDisplayComponent,
        macaddr: TextDisplayComponent,
        macaddr8: TextDisplayComponent,
        cidr: TextDisplayComponent,
        inet: TextDisplayComponent,
        uuid: TextDisplayComponent,

        //long text (textarea)
        text: LongTextDisplayComponent,
        xml: LongTextDisplayComponent,

        //select (select)
        enum: SelectDisplayComponent,

        // json-editor
        json: JsonEditorDisplayComponent,
        jsonb: JsonEditorDisplayComponent,
        ARRAY: JsonEditorDisplayComponent,

        //file
        bytea: FileDisplayComponent,

        //etc
        money: MoneyDisplayComponent,

        //mess (math)
        point: PointDisplayComponent,
        line: TextDisplayComponent,
        circle: TextDisplayComponent,
        path: TextDisplayComponent,
        box: TextDisplayComponent,
        lseg: TextDisplayComponent,

        "foreign key": ForeignKeyDisplayComponent
    },

    mysql: {
        // numbers (number)
        tinyint: NumberDisplayComponent,
        smallint:  NumberDisplayComponent,
        mediumint:  NumberDisplayComponent,
        int:  NumberDisplayComponent,
        bigint:  NumberDisplayComponent,
        decimal: NumberDisplayComponent,
        float:  NumberDisplayComponent,
        double:  NumberDisplayComponent,
        year: NumberDisplayComponent,

        //boolean (radiogroup)
        boolean: BooleanDisplayComponent,

        //datetime (datepicker)
        date: DateDisplayComponent,
        time: TimeDisplayComponent,
        datetime: DateTimeDisplayComponent,
        timestamp: DateTimeDisplayComponent,

        // short text (text)
        char: TextDisplayComponent,
        varchar: TextDisplayComponent,

        //long text (textarea)
        text: LongTextDisplayComponent,
        tinytext: LongTextDisplayComponent,
        mediumtext: LongTextDisplayComponent,
        longtext: LongTextDisplayComponent,

        json: JsonEditorDisplayComponent, //json-editor

        //select (select)
        enum: SelectDisplayComponent,

        //file
        binary: FileDisplayComponent,
        varbinary: FileDisplayComponent,
        blob: FileDisplayComponent,
        tinyblob: FileDisplayComponent,
        mediumblob: FileDisplayComponent,
        longblob: FileDisplayComponent,

        //etc
        set: TextDisplayComponent,

        "foreign key": ForeignKeyDisplayComponent
    },

    oracledb: {
        // numbers (number)
        NUMBER: NumberDisplayComponent,
        FLOAT: NumberDisplayComponent,
        BINARY_FLOAT: NumberDisplayComponent,
        BINARY_DOUBLE: NumberDisplayComponent,
        "INTERVAL YEAR": NumberDisplayComponent,
        "INTERVAL DAY": NumberDisplayComponent,

        //datetime (datepicker)
        DATE: DateDisplayComponent,
        TIMESTAMP: DateTimeDisplayComponent,

        // short text (text)
        CHAR: TextDisplayComponent,
        NCHAR: TextDisplayComponent,
        CLOB: TextDisplayComponent,
        NCLOB: TextDisplayComponent,
        VARCHAR2: TextDisplayComponent,
        VARCHAR: TextDisplayComponent,
        NVARCHAR2: TextDisplayComponent,

        //file
        BLOB: FileDisplayComponent,
        BFILE: FileDisplayComponent,
        RAW: FileDisplayComponent,
        "LONG RAW": FileDisplayComponent,
        LONG: FileDisplayComponent,

        "foreign key": ForeignKeyDisplayComponent
    },

    mssql: {
        // numbers (number)
        bigint: NumberDisplayComponent,
        int: NumberDisplayComponent,
        smallint: NumberDisplayComponent,
        tinyint: NumberDisplayComponent,
        decimal: NumberDisplayComponent,
        bitdecimal: NumberDisplayComponent,
        numeric: NumberDisplayComponent,
        real: NumberDisplayComponent,

        // short text (text)
        uniqueidentifier: IdDisplayComponent,
        char: TextDisplayComponent,
        varchar: TextDisplayComponent,

        //long text (textarea)
        text: LongTextDisplayComponent,
        nchar: LongTextDisplayComponent,
        nvarchar: LongTextDisplayComponent,
        ntext: LongTextDisplayComponent,

        //datetime (datepicker)
        date: DateDisplayComponent,
        datetime: DateTimeDisplayComponent,
        smalldatetime: DateTimeDisplayComponent,
        timestamp: DateTimeDisplayComponent,

        //file
        binary: FileDisplayComponent,
        varbinary: FileDisplayComponent,
        image: ImageDisplayComponent,

        // etc
        money: MoneyDisplayComponent,
        smallmoney: MoneyDisplayComponent,

        "foreign key": ForeignKeyDisplayComponent
    },
    mongodb: {
        // numbers (number)
        number: NumberDisplayComponent,
        double: NumberDisplayComponent,
        int32: NumberDisplayComponent,
        long: NumberDisplayComponent,
        decimal128: NumberDisplayComponent,

        //boolean (radiogroup)
        boolean: BooleanDisplayComponent,

        //datetime (datepicker)
        date: DateDisplayComponent,
        timestamp: DateTimeDisplayComponent,

        // short text (text)
        string: TextDisplayComponent,
        regexp: TextDisplayComponent,
        objectid: TextDisplayComponent,

        //file
        binary: FileDisplayComponent,

        //json
        object: JsonEditorDisplayComponent,
        array: JsonEditorDisplayComponent,

        //etc
        unknown: TextDisplayComponent,

        "foreign key": ForeignKeyDisplayComponent
    },
    dynamodb: {
        string: TextDisplayComponent,
        number: NumberDisplayComponent,
        boolean: BooleanDisplayComponent,
        null: StaticTextDisplayComponent,
        array: JsonEditorDisplayComponent,
        json: JsonEditorDisplayComponent,
        binary: FileDisplayComponent,
    }
}
