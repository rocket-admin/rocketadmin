import { BinaryDataCaptionRowComponent } from '../components/ui-components/row-fields/binary-data-caption/binary-data-caption.component';
import { BooleanRowComponent } from 'src/app/components/ui-components/row-fields/boolean/boolean.component'
import { DateRowComponent } from '../components/ui-components/row-fields/date/date.component';
import { DateTimeRowComponent } from '../components/ui-components/row-fields/date-time/date-time.component';
import { ForeignKeyRowComponent } from '../components/ui-components/row-fields/foreign-key/foreign-key.component';
import { JsonEditorRowComponent } from '../components/ui-components/row-fields/json-editor/json-editor.component';
import { LongTextRowComponent } from 'src/app/components/ui-components/row-fields/long-text/long-text.component'
import { NumberRowComponent } from 'src/app/components/ui-components/row-fields/number/number.component';
import { PasswordRowComponent } from '../components/ui-components/row-fields/password/password.component';
import { PointRowComponent } from 'src/app/components/ui-components/row-fields/point/point.component';
import { SelectRowComponent } from '../components/ui-components/row-fields/select/select.component';
import { StaticTextRowComponent } from '../components/ui-components/row-fields/static-text/static-text.component';
import { TextRowComponent } from 'src/app/components/ui-components/row-fields/text/text.component';
import { TimeRowComponent } from '../components/ui-components/row-fields/time/time.component';
import { TimeIntervalRowComponent } from '../components/ui-components/row-fields/time-interval/time-interval.component';
import { IdRowComponent } from '../components/ui-components/row-fields/id/id.component';
import { FileRowComponent } from '../components/ui-components/row-fields/file/file.component';

export const UIwidgets = {
    Default: '',
    Boolean: BooleanRowComponent,
    Date: DateRowComponent,
    Time: TimeRowComponent,
    DateTime: DateTimeRowComponent,
    JSON: JsonEditorRowComponent,
    Textarea: LongTextRowComponent,
    String: TextRowComponent,
    Readonly: StaticTextRowComponent,
    Number: NumberRowComponent,
    Select: SelectRowComponent,
    Password: PasswordRowComponent,
    File: FileRowComponent
}

export const fieldTypes = {
    postgres: {
        // numbers (number)
        real: NumberRowComponent,
        "double precision": NumberRowComponent,
        smallint: NumberRowComponent,
        integer: NumberRowComponent,
        bigint: NumberRowComponent,
        numeric: NumberRowComponent,

        //boolean (checkbox)
        boolean: BooleanRowComponent,

        //datetime (datepicker)
        "timestamp without time zone": DateTimeRowComponent,
        "timestamp with time zone": DateTimeRowComponent,
        date: DateRowComponent,
        abstime: DateTimeRowComponent,
        realtime: DateTimeRowComponent,
        interval: TimeIntervalRowComponent, // number + select(seconds, days, weeks, years)

        // short text (text)
        "character varying": TextRowComponent,
        macaddr: TextRowComponent, //to do regexp
        macaddr8: TextRowComponent, //to do regexp
        cidr: TextRowComponent, //to do regexp
        inet: TextRowComponent, //to do regexp
        uuid: TextRowComponent, //to do regexp

        //long text (textarea)
        text: LongTextRowComponent,
        xml: LongTextRowComponent,

        //select (select)
        enum: SelectRowComponent,

        // json-editor
        json: JsonEditorRowComponent, //json-editor
        jsonb: JsonEditorRowComponent, //json-editor

        //file
        bytea: FileRowComponent,

        //etc
        money: TextRowComponent,

        //mess (math)
        point: PointRowComponent,
        line: TextRowComponent,
        circle: TextRowComponent,
        path: TextRowComponent,
        box: TextRowComponent,
        lseg: TextRowComponent,

        "foreign key": ForeignKeyRowComponent
    },

    mysql: {
        // numbers (number)
        tinyint: NumberRowComponent,
        smallint:  NumberRowComponent,
        mediumint:  NumberRowComponent,
        int:  NumberRowComponent,
        bigint:  NumberRowComponent,
        decimal: NumberRowComponent,
        float:  NumberRowComponent,
        double:  NumberRowComponent,
        year: NumberRowComponent,

        //boolean (radiogroup)
        boolean: BooleanRowComponent,

        //datetime (datepicker)
        date: DateRowComponent,
        time: TimeRowComponent,
        datetime: DateTimeRowComponent,
        timestamp: DateTimeRowComponent,

        // short text (text)
        char: TextRowComponent,
        varchar: TextRowComponent,

        //long text (textarea)
        text: LongTextRowComponent,
        tinytext: LongTextRowComponent,
        mediumtext: LongTextRowComponent,
        longtext: LongTextRowComponent,

        json: JsonEditorRowComponent, //json-editor

        //select (select)
        enum: SelectRowComponent,

        //file
        binary: FileRowComponent,
        varbinary: FileRowComponent,
        blob: FileRowComponent,
        tinyblob: FileRowComponent,
        mediumblob: FileRowComponent,
        longblob: FileRowComponent,

        //etc
        set: TextRowComponent, //(text)

        "foreign key": ForeignKeyRowComponent
    },

    oracledb: {
        // numbers (number)
        NUMBER: NumberRowComponent,
        FLOAT: NumberRowComponent,
        BINARY_FLOAT: NumberRowComponent,
        BINARY_DOUBLE: NumberRowComponent,
        "INTERVAL YEAR": NumberRowComponent,
        "INTERVAL DAY": NumberRowComponent,

        //datetime (datepicker)
        DATE: DateRowComponent,
        TIMESTAMP: DateTimeRowComponent,

        // short text (text)
        CHAR: TextRowComponent,
        NCHAR: TextRowComponent,
        CLOB: TextRowComponent,
        NCLOB: TextRowComponent,
        VARCHAR2: TextRowComponent,
        VARCHAR: TextRowComponent,
        NVARCHAR2: TextRowComponent,

        //file
        BLOB: FileRowComponent,
        BFILE: FileRowComponent,
        RAW: FileRowComponent,
        "LONG RAW" : FileRowComponent,
        LONG : FileRowComponent,

        "foreign key": ForeignKeyRowComponent
    },

    mssql: {
        // numbers (number)
        bigint: NumberRowComponent,
        int: NumberRowComponent,
        smallint: NumberRowComponent,
        tinyint: NumberRowComponent,
        decimal: NumberRowComponent,
        bitdecimal: NumberRowComponent,
        numeric: NumberRowComponent,
        real: NumberRowComponent,

        // short text (text)
        uniqueidentifier: IdRowComponent,
        char: TextRowComponent,
        varchar: TextRowComponent,

        //long text (textarea)
        text: LongTextRowComponent,
        nchar: LongTextRowComponent,
        nvarchar: LongTextRowComponent,
        ntext: LongTextRowComponent,

        //datetime (datepicker)
        date: DateRowComponent,
        datetime: DateTimeRowComponent,
        smalldatetime: DateTimeRowComponent,
        timestamp: DateTimeRowComponent,

        //file
        binary: FileRowComponent,
        varbinary: FileRowComponent,
        image: FileRowComponent,

        // etc
        money: TextRowComponent,
        smallmoney: TextRowComponent,

        "foreign key": ForeignKeyRowComponent
    },
    mongo: {
        // numbers (number)
        number: NumberRowComponent,
        double: NumberRowComponent,
        int32: NumberRowComponent,
        long: NumberRowComponent,
        decimal128: NumberRowComponent,

        //boolean (radiogroup)
        boolean: BooleanRowComponent,

        //datetime (datepicker)
        date: DateRowComponent,
        timestamp: DateTimeRowComponent,

        // short text (text)
        string: TextRowComponent,
        regexp: TextRowComponent,
        objectid: TextRowComponent,

        //file
        binary: FileRowComponent,

        "foreign key": ForeignKeyRowComponent
    }
}