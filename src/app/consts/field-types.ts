import { BinaryDataCaptionComponent } from '../components/ui-components/row-fields/binary-data-caption/binary-data-caption.component';
import { BooleanComponent } from 'src/app/components/ui-components/row-fields/boolean/boolean.component'
import { DateComponent } from '../components/ui-components/row-fields/date/date.component';
import { DateTimeComponent } from '../components/ui-components/row-fields/date-time/date-time.component';
import { ForeignKeyComponent } from '../components/ui-components/row-fields/foreign-key/foreign-key.component';
import { JsonEditorComponent } from '../components/ui-components/row-fields/json-editor/json-editor.component';
import { LongTextComponent } from 'src/app/components/ui-components/row-fields/long-text/long-text.component'
import { NumberComponent } from 'src/app/components/ui-components/row-fields/number/number.component';
import { PasswordComponent } from '../components/ui-components/row-fields/password/password.component';
import { PointComponent } from 'src/app/components/ui-components/row-fields/point/point.component';
import { SelectComponent } from '../components/ui-components/row-fields/select/select.component';
import { StaticTextComponent } from '../components/ui-components/row-fields/static-text/static-text.component';
import { TextComponent } from 'src/app/components/ui-components/row-fields/text/text.component';
import { TimeComponent } from '../components/ui-components/row-fields/time/time.component';
import { TimeIntervalComponent } from '../components/ui-components/row-fields/time-interval/time-interval.component';
import { IdComponent } from '../components/ui-components/row-fields/id/id.component';

export const UIwidgets = {
    Default: '',
    Boolean: BooleanComponent,
    Date: DateComponent,
    Time: TimeComponent,
    DateTime: DateTimeComponent,
    JSON: JsonEditorComponent,
    Textarea: LongTextComponent,
    String: TextComponent,
    Readonly: StaticTextComponent,
    Number: NumberComponent,
    Select: SelectComponent,
    Password: PasswordComponent
}

export const fieldTypes = {
    postgres: {
        // numbers (number)
        real: NumberComponent,
        "double precision": NumberComponent,
        smallint: NumberComponent,
        integer: NumberComponent,
        bigint: NumberComponent,
        numeric: NumberComponent,
        bytea: NumberComponent,

        //boolean (checkbox)
        boolean: BooleanComponent,

        //datetime (datepicker)
        "timestamp without time zone": DateTimeComponent,
        "timestamp with time zone": DateTimeComponent,
        date: DateComponent,
        abstime: DateTimeComponent,
        realtime: DateTimeComponent,
        interval: TimeIntervalComponent, // number + select(seconds, days, weeks, years)

        // short text (text)
        "character varying": TextComponent,
        macaddr: TextComponent, //to do regexp
        macaddr8: TextComponent, //to do regexp
        cidr: TextComponent, //to do regexp
        inet: TextComponent, //to do regexp
        uuid: TextComponent, //to do regexp

        //long text (textarea)
        text: LongTextComponent,
        xml: LongTextComponent,

        //select (select)
        enum: SelectComponent,

        // json-editor
        json: JsonEditorComponent, //json-editor
        jsonb: JsonEditorComponent, //json-editor

        //etc
        money: TextComponent,

        //mess (math)
        point: PointComponent,
        line: TextComponent,
        circle: TextComponent,
        path: TextComponent,
        box: TextComponent,
        lseg: TextComponent,

        "foreign key": ForeignKeyComponent
    },

    mysql: {
        // numbers (number)
        tinyint: NumberComponent,
        smallint:  NumberComponent,
        mediumint:  NumberComponent,
        int:  NumberComponent,
        bigint:  NumberComponent,
        decimal: NumberComponent,
        float:  NumberComponent,
        double:  NumberComponent,
        year: NumberComponent,

        //boolean (radiogroup)
        boolean: BooleanComponent,

        //datetime (datepicker)
        date: DateComponent,
        time: TimeComponent,
        datetime: DateTimeComponent,
        timestamp: DateTimeComponent,

        // short text (text)
        char: TextComponent,
        varchar: TextComponent,

        //long text (textarea)
        text: LongTextComponent,
        tinytext: LongTextComponent,
        mediumtext: LongTextComponent,
        longtext: LongTextComponent,

        json: JsonEditorComponent, //json-editor

        //select (select)
        enum: SelectComponent,

        //etc
        set: TextComponent, //(text)
        binary: TextComponent, //(text)
        varbinary: TextComponent, //(text)
        blob: BinaryDataCaptionComponent, //(span) "binary data"
        tinyblob: BinaryDataCaptionComponent, //(span) "binary data"
        mediumblob: BinaryDataCaptionComponent, //(span) "binary data"
        longblob: BinaryDataCaptionComponent, //(span) "binary data"

        "foreign key": ForeignKeyComponent
    },

    oracledb: {
        // numbers (number)
        NUMBER: NumberComponent,
        FLOAT: NumberComponent,
        BINARY_FLOAT: NumberComponent,
        BINARY_DOUBLE: NumberComponent,
        "INTERVAL YEAR": NumberComponent,
        "INTERVAL DAY": NumberComponent,

        //datetime (datepicker)
        DATE: DateComponent,
        TIMESTAMP: DateTimeComponent,

        // short text (text)
        CHAR: TextComponent,
        NCHAR: TextComponent,
        VARCHAR2: TextComponent,
        VARCHAR: TextComponent,
        NVARCHAR2: TextComponent,

        //etc
        BLOB: BinaryDataCaptionComponent, //(span) binary data
        CLOB: BinaryDataCaptionComponent, //(span) binary data
        NCLOB: BinaryDataCaptionComponent, //(span) binary data
        BFILE: BinaryDataCaptionComponent, //(span) binary data
        RAW: BinaryDataCaptionComponent, //(span) binary data
        "LONG RAW" : BinaryDataCaptionComponent, //(span) binary data
        LONG : BinaryDataCaptionComponent, //(span) binary data

        "foreign key": ForeignKeyComponent
    },

    mssql: {
        // numbers (number)
        bigint: NumberComponent,
        int: NumberComponent,
        smallint: NumberComponent,
        tinyint: NumberComponent,
        bitdecimal: NumberComponent,
        numeric: NumberComponent,
        real: NumberComponent,

        // short text (text)
        uniqueidentifier: IdComponent,
        char: TextComponent,
        varchar: TextComponent,

        //long text (textarea)
        text: LongTextComponent,
        nchar: LongTextComponent,
        nvarchar: LongTextComponent,
        ntext: LongTextComponent,

        //datetime (datepicker)
        datetime: DateTimeComponent,
        smalldatetime: DateTimeComponent,
        timestamp: DateTimeComponent,

        // etc
        money: TextComponent,
        smallmoney: TextComponent,
        binary: BinaryDataCaptionComponent,
        varbinary: BinaryDataCaptionComponent,
        image: BinaryDataCaptionComponent,

        "foreign key": ForeignKeyComponent
    }
}