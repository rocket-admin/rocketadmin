import type { ThemePreference } from '@/lib/color-theme';

export interface GlobalSettingsUI {
	connectionsListCollapsed: boolean;
	lastFeatureNotificationId: string;
	profileSidebarCollapsed?: boolean;
	theme?: ThemePreference;
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
