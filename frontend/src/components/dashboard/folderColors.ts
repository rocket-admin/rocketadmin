// The folder icon colours offered by the folder edit dialog. They are data, stored with the folder
// (`category_color`) and shared with the Angular app, so they stay literal values, not tokens.
export interface FolderIconColor {
	name: string;
	value: string;
}

export const FOLDER_ICON_COLORS: FolderIconColor[] = [
	{ name: 'Default', value: 'rgba(0, 0, 0, 0.87)' },
	{ name: 'Blue', value: '#2196F3' },
	{ name: 'Green', value: '#4CAF50' },
	{ name: 'Orange', value: '#FF9800' },
	{ name: 'Red', value: '#F44336' },
	{ name: 'Purple', value: '#9C27B0' },
	{ name: 'Teal', value: '#009688' },
	{ name: 'Pink', value: '#E91E63' },
];

/** The edit dialog's colour for a folder without one. */
export const DEFAULT_FOLDER_COLOR = '#757575';
