export enum AlertType {
    Warning = 'warning',
    Error = 'error',
    Info = 'info',
    Success = 'success'
}

export enum AlertActionType {
    Anchor = 'external link',
    Link = 'internal link',
    Button = 'button',
}

export interface AlertAction {
    type: AlertActionType,
    caption: string,
    to?: string,
    action?: (id: number) => void,
    testID?: string
}

export interface Alert {
    id: number,
    type: AlertType,
    message: ServerError | string,
    actions?: AlertAction[]
}

export interface ServerError {
    abstract: string,
    details: string
}