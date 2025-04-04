export interface GlobalSettingsUI {
    connectionsListCollapsed: boolean;
    lastFeatureNotificationId: string;
}

export interface TableSettingsUI {
    shownColumns: string[];
}

export interface ConnectionSettingsUI {
    shownTableTitles: boolean;
    tables: { [tableName: string]: TableSettingsUI };
}

export interface UiSettings {
    globalSettings: GlobalSettingsUI;
    connections: { [connectionId: string]: ConnectionSettingsUI };
}