export interface GlobalSettingsUI {
    connectionsListCollapsed: boolean;
    lastFeatureNotificationId: string;
    profileSidebarCollapsed?: boolean;
}

export interface TableSettingsUI {
    shownColumns?: string[];
    defaultSort?: {
        column: string;
        direction: 'asc' | 'desc';
    };
}

export interface ConnectionSettingsUI {
    shownTableTitles: boolean;
    tables: { [tableName: string]: TableSettingsUI };
    tableFoldersExpanded?: string[];
    dashboardsSidebarCollapsed?: boolean;
}

export interface UiSettings {
    globalSettings: GlobalSettingsUI;
    connections: { [connectionId: string]: ConnectionSettingsUI };
}