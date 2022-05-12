export enum BannerType {
    Warning = 'warning',
    Error = 'error',
    Info = 'info',
    Success = 'success'
}

export enum BannerActionType {
    Anchor = 'external link',
    Link = 'internal link',
    Button = 'button',
}

export interface BannerAction {
    type: BannerActionType,
    caption: string,
    to?: string,
    action?: (id: number) => void;
}

export interface Banner {
    id: number,
    type: BannerType,
    message: string,
    actions?: BannerAction[]
}

