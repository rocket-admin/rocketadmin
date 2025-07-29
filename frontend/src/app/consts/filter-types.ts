import { BinaryDataCaptionFilterComponent } from '../components/ui-components/filter-fields/binary-data-caption/binary-data-caption.component';
import { BooleanFilterComponent } from 'src/app/components/ui-components/filter-fields/boolean/boolean.component'
import { CountryFilterComponent } from '../components/ui-components/filter-fields/country/country.component';
import { DateFilterComponent } from '../components/ui-components/filter-fields/date/date.component';
import { DateTimeFilterComponent } from '../components/ui-components/filter-fields/date-time/date-time.component';
import { FileFilterComponent } from '../components/ui-components/filter-fields/file/file.component';
import { ForeignKeyFilterComponent } from '../components/ui-components/filter-fields/foreign-key/foreign-key.component';
import { IdFilterComponent } from '../components/ui-components/filter-fields/id/id.component';
import { JsonEditorFilterComponent } from '../components/ui-components/filter-fields/json-editor/json-editor.component';
import { LongTextFilterComponent } from 'src/app/components/ui-components/filter-fields/long-text/long-text.component'
import { NumberFilterComponent } from 'src/app/components/ui-components/filter-fields/number/number.component';
import { PasswordFilterComponent } from '../components/ui-components/filter-fields/password/password.component';
import { PointFilterComponent } from 'src/app/components/ui-components/filter-fields/point/point.component';
import { SelectFilterComponent } from '../components/ui-components/filter-fields/select/select.component';
import { StaticTextFilterComponent } from '../components/ui-components/filter-fields/static-text/static-text.component';
import { TextFilterComponent } from 'src/app/components/ui-components/filter-fields/text/text.component';
import { TimeFilterComponent } from '../components/ui-components/filter-fields/time/time.component';
import { TimeIntervalFilterComponent } from '../components/ui-components/filter-fields/time-interval/time-interval.component';

export const UIwidgets = {
    Default: '',
    Boolean: BooleanFilterComponent,
    Date: DateFilterComponent,
    Time: TimeFilterComponent,
    DateTime: DateTimeFilterComponent,
    JSON: JsonEditorFilterComponent,
    Textarea: LongTextFilterComponent,
    String: TextFilterComponent,
    Readonly: StaticTextFilterComponent,
    Number: NumberFilterComponent,
    Select: SelectFilterComponent,
    Password: PasswordFilterComponent,
    File: FileFilterComponent,
    Country: CountryFilterComponent
}

export const filterTypes = {
    postgres: {
        // numbers (number)
        real: NumberFilterComponent,
        "double precision": NumberFilterComponent,
        smallint: NumberFilterComponent,
        integer: NumberFilterComponent,
        bigint: NumberFilterComponent,
        numeric: NumberFilterComponent,

        //boolean (checkbox)
        boolean: BooleanFilterComponent,

        //datetime (datepicker)
        "timestamp without time zone": DateTimeFilterComponent,
        "timestamp with time zone": DateTimeFilterComponent,
        date: DateFilterComponent,
        abstime: DateTimeFilterComponent,
        realtime: DateTimeFilterComponent,
        interval: TimeIntervalFilterComponent, // number + select(seconds, days, weeks, years)

        // short text (text)
        "character varying": TextFilterComponent,
        macaddr: TextFilterComponent, //to do regexp
        macaddr8: TextFilterComponent, //to do regexp
        cidr: TextFilterComponent, //to do regexp
        inet: TextFilterComponent, //to do regexp
        uuid: TextFilterComponent, //to do regexp

        //long text (textarea)
        text: LongTextFilterComponent,
        xml: LongTextFilterComponent,

        //select (select)
        enum: SelectFilterComponent,

        // json-editor
        json: JsonEditorFilterComponent, //json-editor
        jsonb: JsonEditorFilterComponent, //json-editor

        //file
        bytea: FileFilterComponent,

        //etc
        money: TextFilterComponent,

        //mess (math)
        point: PointFilterComponent,
        line: TextFilterComponent,
        circle: TextFilterComponent,
        path: TextFilterComponent,
        box: TextFilterComponent,
        lseg: TextFilterComponent,

        "foreign key": ForeignKeyFilterComponent
    },

    mysql: {
        // numbers (number)
        tinyint: NumberFilterComponent,
        smallint:  NumberFilterComponent,
        mediumint:  NumberFilterComponent,
        int:  NumberFilterComponent,
        bigint:  NumberFilterComponent,
        decimal: NumberFilterComponent,
        float:  NumberFilterComponent,
        double:  NumberFilterComponent,
        year: NumberFilterComponent,

        //boolean (radiogroup)
        boolean: BooleanFilterComponent,

        //datetime (datepicker)
        date: DateFilterComponent,
        time: TimeFilterComponent,
        datetime: DateTimeFilterComponent,
        timestamp: DateTimeFilterComponent,

        // short text (text)
        char: TextFilterComponent,
        varchar: TextFilterComponent,

        //long text (textarea)
        text: LongTextFilterComponent,
        tinytext: LongTextFilterComponent,
        mediumtext: LongTextFilterComponent,
        longtext: LongTextFilterComponent,

        json: JsonEditorFilterComponent, //json-editor

        //select (select)
        enum: SelectFilterComponent,

        //file
        binary: FileFilterComponent,
        varbinary: FileFilterComponent,
        blob: FileFilterComponent,
        tinyblob: FileFilterComponent,
        mediumblob: FileFilterComponent,
        longblob: FileFilterComponent,

        //etc
        set: TextFilterComponent, //(text)

        "foreign key": ForeignKeyFilterComponent
    },

    oracledb: {
        // numbers (number)
        NUMBER: NumberFilterComponent,
        FLOAT: NumberFilterComponent,
        BINARY_FLOAT: NumberFilterComponent,
        BINARY_DOUBLE: NumberFilterComponent,
        "INTERVAL YEAR": NumberFilterComponent,
        "INTERVAL DAY": NumberFilterComponent,

        //datetime (datepicker)
        DATE: DateFilterComponent,
        TIMESTAMP: DateTimeFilterComponent,

        // short text (text)
        CHAR: TextFilterComponent,
        NCHAR: TextFilterComponent,
        CLOB: TextFilterComponent,
        NCLOB: TextFilterComponent,
        VARCHAR2: TextFilterComponent,
        VARCHAR: TextFilterComponent,
        NVARCHAR2: TextFilterComponent,

        //file
        BLOB: FileFilterComponent,
        BFILE: FileFilterComponent,
        RAW: FileFilterComponent,
        "LONG RAW" : FileFilterComponent,
        LONG : FileFilterComponent,

        "foreign key": ForeignKeyFilterComponent
    },

    mssql: {
        // numbers (number)
        bigint: NumberFilterComponent,
        int: NumberFilterComponent,
        smallint: NumberFilterComponent,
        tinyint: NumberFilterComponent,
        decimal: NumberFilterComponent,
        bitdecimal: NumberFilterComponent,
        numeric: NumberFilterComponent,
        real: NumberFilterComponent,

        // short text (text)
        uniqueidentifier: IdFilterComponent,
        char: TextFilterComponent,
        varchar: TextFilterComponent,

        //long text (textarea)
        text: LongTextFilterComponent,
        nchar: LongTextFilterComponent,
        nvarchar: LongTextFilterComponent,
        ntext: LongTextFilterComponent,

        //datetime (datepicker)
        date: DateFilterComponent,
        datetime: DateTimeFilterComponent,
        smalldatetime: DateTimeFilterComponent,
        timestamp: DateTimeFilterComponent,

        //file
        binary: FileFilterComponent,
        varbinary: FileFilterComponent,
        image: FileFilterComponent,

        // etc
        money: TextFilterComponent,
        smallmoney: TextFilterComponent,

        "foreign key": ForeignKeyFilterComponent
    },
    mongodb: {
        // numbers (number)
        number: NumberFilterComponent,
        double: NumberFilterComponent,
        int32: NumberFilterComponent,
        long: NumberFilterComponent,
        decimal128: NumberFilterComponent,

        //boolean (radiogroup)
        boolean: BooleanFilterComponent,

        //datetime (datepicker)
        date: DateFilterComponent,
        timestamp: DateTimeFilterComponent,

        // short text (text)
        string: TextFilterComponent,
        regexp: TextFilterComponent,
        objectid: TextFilterComponent,

        //file
        binary: FileFilterComponent,

        //json
        //json
        object: JsonEditorFilterComponent,
        array: JsonEditorFilterComponent,

        "foreign key": ForeignKeyFilterComponent
    },
    cassandra: {
        int: NumberFilterComponent,
        bigint: NumberFilterComponent,
        varint: NumberFilterComponent,
        decimal: NumberFilterComponent,
        float: NumberFilterComponent,
        double: NumberFilterComponent,

        boolean: BooleanFilterComponent,

        timeuuid: IdFilterComponent,

        timestamp: DateTimeFilterComponent,
        date: DateFilterComponent,
        time: TimeFilterComponent,

        uuid: TextFilterComponent,
        varchar: TextFilterComponent,
        inet: TextFilterComponent,
        ascii: TextFilterComponent,
        text: TextFilterComponent,

        list: JsonEditorFilterComponent,
        map: JsonEditorFilterComponent,
        set: JsonEditorFilterComponent,
    }
}