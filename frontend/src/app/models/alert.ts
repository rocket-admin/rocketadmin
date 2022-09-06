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
    action?: (id: number) => void;
}

export interface Alert {
    id: number,
    type: AlertType,
    message: string,
    actions?: AlertAction[]
}

