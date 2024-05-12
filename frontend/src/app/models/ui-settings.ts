export interface GlobalSettings {
    connectionsListCollapsed: boolean;
}

export interface TableSettings {
    shownColumns: string[];
}

export interface ConnectionSettings {
    shownTableTitles: boolean;
    tables: { [tableName: string]: TableSettings };
}

export interface UiSettings {
    globalSettings: GlobalSettings;
    connections: { [connectionId: string]: ConnectionSettings };
}