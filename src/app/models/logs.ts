export enum LogAction {
    Add = 'addRow',
    Delete = 'deleteRow',
    Update = 'updateRow',
    ReceiveRow = "rowReceived",
    ReceiveRows = "rowsReceived",
}

export enum LogStatus {
    Successfully = 'successfully',
    Unsuccessfully = 'unsuccessfully'
}

export interface Log {
    Table: string,
    User: string,
    Action: string,
    Date: string,
    Status: LogStatus,
    operationType: LogAction,
    createdAt: string,
    prevValue: Object,
    currentValue: Object,
}