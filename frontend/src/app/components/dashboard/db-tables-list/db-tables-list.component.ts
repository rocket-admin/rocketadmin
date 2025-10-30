import { Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { DbFolderDeleteDialogComponent, DbFolderDeleteDialogData } from './db-folder-delete-dialog/db-folder-delete-dialog.component';
import { DbFolderEditDialogComponent, DbFolderEditDialogData } from './db-folder-edit-dialog/db-folder-edit-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TableProperties, TableSettings } from 'src/app/models/table';

import { CommonModule } from '@angular/common';
import { ConnectionsService } from 'src/app/services/connections.service';
import { ContentLoaderComponent } from '../../ui-components/content-loader/content-loader.component';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { TableCategory } from 'src/app/models/connection';
import { TableStateService } from 'src/app/services/table-state.service';
import { TablesService } from 'src/app/services/tables.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';

export interface Folder {
  id: string;
  name: string;
  expanded: boolean;
  tableIds: string[];
  iconColor?: string; // Optional color for folder icon
  isEmpty?: boolean; // Flag to indicate if folder is newly created and empty
}

@Component({
  selector: 'app-db-tables-list',
  templateUrl: './db-tables-list.component.html',
  styleUrls: ['./db-tables-list.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
    RouterModule,
    ContentLoaderComponent
  ]
})
export class DbTablesListComponent implements OnInit, OnChanges {
  @Input() connectionID: string;
  @Input() connectionTitle: string;
  @Input() tables: TableProperties[];
  @Input() selectedTable: string;
  @Input() collapsed: boolean;
  @Input() uiSettings: any;

  @Output() expandSidebar = new EventEmitter<void>();

  public tableCategories: TableCategory[] = [];
  public substringToSearch: string;
  public foundTables: TableProperties[];
  public folders: Folder[] = [];

  // Dialog state
  public currentFolder: Folder | null = null;

  // Drag and drop state
  public draggedTable: TableProperties | null = null;
  public dragOverFolder: string | null = null;

  // Collapsed state
  public showCollapsedTableList: boolean = false;
  public currentCollapsedFolder: Folder | null = null;

  // State preservation
  private preservedFolderStates: { [key: string]: boolean } = {};
  private preservedActiveFolder: string | null = null;

  // Table icons cache
  private tableIcons: { [key: string]: string } = {};

  // Folder icon colors
  public folderIconColors = [
    { name: 'Default', value: '#212121' },
    { name: 'Blue', value: '#2196F3' },
    { name: 'Green', value: '#4CAF50' },
    { name: 'Orange', value: '#FF9800' },
    { name: 'Red', value: '#F44336' },
    { name: 'Purple', value: '#9C27B0' },
    { name: 'Teal', value: '#009688' },
    { name: 'Pink', value: '#E91E63' }
  ];

  constructor(
    private _tableState: TableStateService,
    private _tablesService: TablesService,
    private _connectionsService: ConnectionsService,
    private _uiSettingsService: UiSettingsService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.foundTables = this.tables;
    this.loadFolders();
    console.log('ngOnInit - showCollapsedTableList initialized to:', this.showCollapsedTableList);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['collapsed']) {
      if (changes['collapsed'].currentValue === true) {
        // Sidebar is being collapsed - preserve current state
        this.preserveFolderStates();
      } else if (changes['collapsed'].currentValue === false) {
        // Sidebar is being expanded - restore preserved state
        this.restoreFolderStates();
      }
    }
  }

  searchSubstring() {
    if (!this.substringToSearch || this.substringToSearch.trim() === '') {
      this.foundTables = this.tables;
      // Collapse all folders when search is cleared
      this.folders.forEach(folder => {
        folder.expanded = false;
      });
      return;
    }

    const searchTerm = this.substringToSearch.toLowerCase();

    // Get all tables that match the search (including those in folders)
    const allTables = [...this.tables];

    // Add tables from folders that might not be in the main tables list
    this.folders.forEach(folder => {
      folder.tableIds.forEach(tableId => {
        // Find the table object by ID
        const tableInFolder = this.tables.find(t => t.table === tableId);
        if (tableInFolder && !allTables.find(t => t.table === tableId)) {
          allTables.push(tableInFolder);
        }
      });
    });

    // Filter all tables by search term
    this.foundTables = allTables.filter(tableItem =>
      tableItem.table.toLowerCase().includes(searchTerm) ||
      (tableItem.display_name && tableItem.display_name.toLowerCase().includes(searchTerm)) ||
      (tableItem.normalizedTableName && tableItem.normalizedTableName.toLowerCase().includes(searchTerm))
    );

    // Remove duplicates
    this.foundTables = this.foundTables.filter((table, index, self) =>
      index === self.findIndex(t => t.table === table.table)
    );

    // Expand all folders that contain matching tables
    this.folders.forEach(folder => {
      const folderTables = this.getFolderTables(folder);
      const hasMatchingTables = folderTables.some(table =>
        this.foundTables.some(foundTable => foundTable.table === table.table)
      );

      if (hasMatchingTables) {
        folder.expanded = true;
      } else {
        folder.expanded = false;
      }
    });
  }

  getTableName(table: TableProperties) {
    return table.display_name || table.normalizedTableName || table.table
  }

  // saveCollapsedMenuState() {
  //   const state = {
  //     showCollapsedTableList: this.showCollapsedTableList,
  //     currentCollapsedFolderId: this.currentCollapsedFolder?.id || null
  //   };
  //   const key = `collapsedMenuState_${this.connectionID}`;
  //   localStorage.setItem(key, JSON.stringify(state));
  //   console.log('Collapsed menu state saved:', state);
  // }

  // loadAndSetExpandedFolders() {

  // }

  getTableNameLength(tableName: string) {
    return tableName.length;
  }

  closeSidebar() {
    this._tableState.clearSelection();
    this._tableState.closeAIpanel();
  }

  onAddFolder() {
    const newFolder: Folder = {
      id: this.generateFolderId(),
      name: `Folder ${this.folders.length}`,
      expanded: true, // Разворачиваем папку сразу после создания
      tableIds: [],
      isEmpty: true // Mark as empty for special styling
    };
    this.folders.push(newFolder);
    console.log('onAddFolder');
    this.saveFolders();
  }

  toggleFolder(folderId: string) {
    const folder = this.folders.find (f => f.id === folderId);
    if (folder) {
      folder.expanded = !folder.expanded;
      const expandedFolders = this.folders.filter(f => f.expanded).map(f => f.id);
      this._uiSettingsService.updateConnectionSetting(this.connectionID, 'tableFoldersExpanded', expandedFolders);
    }
  }

  onCollapsedFolderClick(folder: Folder) {
    console.log('Clicked on folder:', folder.name);

    // If clicking on the same folder that's already open, close it
    if (this.currentCollapsedFolder?.id === folder.id) {
      this.showCollapsedTableList = false;
      this.currentCollapsedFolder = null;
    } else {
      // If clicking on a different folder, open it immediately
      this.showCollapsedTableList = true;
      this.currentCollapsedFolder = folder;
    }

    // Save the collapsed menu state
    // this.saveCollapsedMenuState();

    console.log('showCollapsedTableList is now:', this.showCollapsedTableList);
    console.log('currentCollapsedFolder is now:', this.currentCollapsedFolder?.name);
  }

  getCollapsedTableList(): TableProperties[] {
    if (!this.currentCollapsedFolder) {
      console.log('No current collapsed folder');
      return [];
    }

    const tables = this.getFolderTables(this.currentCollapsedFolder);
    console.log('getCollapsedTableList - tables:', tables);
    return tables;
  }

  navigateToTable(table: TableProperties) {
    // This method is called when clicking on a table in collapsed mode
    // The actual navigation is handled by routerLink in the template
    // We just need to close the sidebar after navigation
    this.closeSidebar();
  }

  toggleCollapsedSearch() {
    // Open the sidebar and activate search
    this.expandSidebar.emit();
    // Focus on search input after sidebar expands
    setTimeout(() => {
      const input = document.querySelector('.search-input input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 300); // Wait for sidebar animation to complete
  }

  deleteFolder(folder: Folder) {
    const dialogData: DbFolderDeleteDialogData = {
      folderName: folder.name,
      tableCount: folder.tableIds.length
    };

    const dialogRef = this.dialog.open(DbFolderDeleteDialogComponent, {
      width: '24em',
      data: dialogData,
      panelClass: 'db-folder-delete-dialog'
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        const index = this.folders.findIndex(f => f.id === folder.id);
        if (index > -1) {
          this.folders.splice(index, 1);
          this.saveFolders();
        }
      }
    });
  }


  onMenuClosed() {
    // Menu closed, no action needed
  }

  closeMenu(menu: any) {
    if (menu && menu.close) {
      menu.close();
    }
  }




  getFolderTables(folder: Folder): TableProperties[] {
    const folderTables = this.tables.filter(table => folder.tableIds.includes(table.table));

    // If there's a search term, filter the collection tables too
    if (this.substringToSearch && this.substringToSearch.trim() !== '') {
      const searchTerm = this.substringToSearch.toLowerCase();
      return folderTables.filter(table =>
        table.table.toLowerCase().includes(searchTerm) ||
        (table.display_name && table.display_name.toLowerCase().includes(searchTerm)) ||
        (table.normalizedTableName && table.normalizedTableName.toLowerCase().includes(searchTerm))
      );
    }

    return folderTables;
  }

  getAvailableTables(folder: Folder | null): TableProperties[] {
    if (!folder) return [];
    return this.tables.filter(table => !folder.tableIds.includes(table.table));
  }

  isTableInAnyFolder(table: TableProperties): boolean {
    return this.folders.some(folder => folder.tableIds.includes(table.table));
  }

  shouldShowFolder(folder: Folder): boolean {
    // If no search term, show all folders
    if (!this.substringToSearch || this.substringToSearch.trim() === '') {
      return true;
    }

    // Show collection if it has tables matching the search
    const matchingTables = this.getFolderTables(folder);
    return matchingTables.length > 0;
  }

  showEditTablesDialog(folder: Folder) {
    // Expand the folder if it's collapsed
    folder.expanded = true;

    const dialogData: DbFolderEditDialogData = {
      folder: folder,
      tables: this.tables,
      folderIconColors: this.folderIconColors
    };

    const dialogRef = this.dialog.open(DbFolderEditDialogComponent, {
      width: '32em',
      data: dialogData,
      panelClass: 'db-folder-edit-dialog'
    });

    dialogRef.afterClosed().subscribe((result: Folder | undefined) => {
      if (result) {
        // Update the folder with the result from dialog
        const index = this.folders.findIndex(f => f.id === result.id);
        if (index !== -1) {
          this.folders[index] = result;
          this.saveFolders();
        }
      }
    });
  }


  getFolderIconColor(folder: Folder, isActive?: boolean): string {
    if (isActive) {
      return '#212121'; // Black for active folders
    }

    // Check if we're in dark theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // In dark theme, use #212121 for folders without custom color
      return folder.iconColor || '#212121';
    }

    // In light theme, use default color
    return folder.iconColor || '#212121';
  }


  get allTables(): TableProperties[] {
    return this.tables;
  }

  isTableInFolder(table: TableProperties): boolean {
    return this.currentFolder ? this.currentFolder.tableIds.includes(table.table) : false;
  }

  isTableInCurrentDraggedFolder(table: TableProperties, folder: Folder): boolean {
    return this.draggedTable &&
      this.draggedTable.table === table.table &&
      folder.tableIds.includes(table.table);
  }

  toggleTableInFolder(table: TableProperties) {
    if (!this.currentFolder) return;

    const tableId = table.table;
    const isInFolder = this.currentFolder.tableIds.includes(tableId);

    if (isInFolder) {
      // Remove from folder
      this.currentFolder.tableIds = this.currentFolder.tableIds.filter(id => id !== tableId);
    } else {
      // Add to folder
      this.currentFolder.tableIds.push(tableId);
      // Remove empty flag when adding tables
      if (this.currentFolder.isEmpty) {
        this.currentFolder.isEmpty = false;
      }
    }

    console.log('toggleTableInFolder');
    this.saveFolders();
  }


  removeTableFromFolder(folder: Folder, table: TableProperties, event: Event) {
    event.stopPropagation();
    folder.tableIds = folder.tableIds.filter(id => id !== table.table);
    console.log('removeTableFromFolder');
    this.saveFolders();
  }

  trackByFolderId(index: number, folder: Folder): string {
    return folder.id;
  }

  private preserveFolderStates() {
    // Save expanded states of all folders
    this.folders.forEach(folder => {
      this.preservedFolderStates[folder.id] = folder.expanded;
    });

    // Check if there are only "All Tables" folder (no custom folders)
    const hasCustomFolders = this.folders.some(folder => folder.name !== 'All Tables');

    // If no custom folders exist, ensure "All Tables" is always expanded
    if (!hasCustomFolders) {
      const allTablesFolder = this.folders.find(folder => folder.name === 'All Tables');
      if (allTablesFolder) {
        this.preservedFolderStates[allTablesFolder.id] = true;
        this.preservedActiveFolder = allTablesFolder.id;
      }
    } else {
      // Find and save the currently active folder (the one that contains selected table)
      const activeFolder = this.findActiveFolder();
      this.preservedActiveFolder = activeFolder ? activeFolder.id : null;
    }

    console.log('Preserved folder states:', this.preservedFolderStates);
    console.log('Preserved active folder:', this.preservedActiveFolder);
    console.log('Expanded folders count:', Object.values(this.preservedFolderStates).filter(expanded => expanded).length);
  }

  private restoreFolderStates() {
    // Check if there are only "All Tables" folder (no custom folders)
    const hasCustomFolders = this.folders.some(folder => folder.name !== 'All Tables');

    // If no custom folders exist, always expand "All Tables"
    if (!hasCustomFolders) {
      const allTablesFolder = this.folders.find(folder => folder.name === 'All Tables');
      if (allTablesFolder) {
        allTablesFolder.expanded = true;
        this.currentCollapsedFolder = allTablesFolder;
        this.showCollapsedTableList = true;
        console.log('No custom folders - keeping All Tables expanded');
        // Save the collapsed menu state after restoration
        // this.saveCollapsedMenuState();
        return;
      }
    }

    // Restore expanded states of all folders
    this.folders.forEach(folder => {
      if (this.preservedFolderStates.hasOwnProperty(folder.id)) {
        folder.expanded = this.preservedFolderStates[folder.id];
      }
    });

    // In collapsed view, show the table list if any folder was expanded
    const hasExpandedFolders = Object.values(this.preservedFolderStates).some(expanded => expanded);
    if (hasExpandedFolders) {
      // If there was an active folder, use it; otherwise use the first expanded folder
      let targetFolder = null;

      if (this.preservedActiveFolder) {
        targetFolder = this.folders.find(f => f.id === this.preservedActiveFolder);
      }

      if (!targetFolder) {
        // Find the first expanded folder
        targetFolder = this.folders.find(f => this.preservedFolderStates[f.id]);
      }

      if (targetFolder) {
        this.currentCollapsedFolder = targetFolder;
        this.showCollapsedTableList = true;
      }
    }

    console.log('Restored folder states:', this.preservedFolderStates);
    console.log('Restored active folder:', this.preservedActiveFolder);
    console.log('Has expanded folders:', hasExpandedFolders);

    // Save the collapsed menu state after restoration
    // this.saveCollapsedMenuState();
  }

  private findActiveFolder(): Folder | null {
    if (!this.selectedTable) return null;

    return this.folders.find(folder =>
      folder.tableIds.includes(this.selectedTable)
    ) || null;
  }

  private generateFolderId(): string {
    return Date.now().toString();
  }

  private loadFolders() {
    this._connectionsService.getTablesFolders(this.connectionID).subscribe({
      next: (categories: TableCategory[]) => {
        if (categories && categories.length > 0) {
          this.tableCategories = categories;
          this.folders = categories.map(cat => ({
            id: cat.category_id,
            name: cat.category_name,
            expanded: false,
            tableIds: cat.tables,
            iconColor: cat.category_color
          }));
          console.log('Folders loaded from connection settings:', this.folders.map(c => ({ name: c.name, expanded: c.expanded })));
        } else {
          console.log('No folders found in connection settings.');
          this.folders = [];
        }

        const expandedFolders = this.uiSettings.tableFoldersExpanded;
        if (expandedFolders && expandedFolders.length > 0) {
          this.folders.forEach(folder => {
            folder.expanded = expandedFolders.includes(folder.id);
          });
        }

        const allTablesFolder: Folder = {
          id: '0',
          name: 'All Tables',
          expanded: expandedFolders && expandedFolders.length === 0 ? false : expandedFolders.includes('0'),
          tableIds: this.tables.map(table => table.table)
        };
        this.folders.unshift(allTablesFolder);
      },
      error: (error) => {
        console.error('Error fetching folders from connection settings:', error);
        this.folders = [];
      }
    });
  }

  private saveFolders() {
    try {
      this.tableCategories = this.folders
        .filter(folder => folder.name !== 'All Tables') // Exclude "All Tables" from saving
        .map(folder => ({
          category_id: folder.id,
          category_name: folder.name,
          category_color: folder.iconColor,
          tables: folder.tableIds
        }));
      this._connectionsService.updateTablesFolders(this.connectionID, this.tableCategories).subscribe({
        next: () => {
          console.log('Connection settings updated with folders.');
        },
        error: (error) => {
          console.error('Error updating connection settings with folders:', error);
        }
      });
    } catch (e) {
      console.error('Error saving folders:', e);
    }
  }

  // Drag and drop methods
  onTableDragStart(event: DragEvent, table: TableProperties) {
    this.draggedTable = table;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', table.table);
    }
  }

  onTableDragEnd(event: DragEvent) {
    this.draggedTable = null;
    this.dragOverFolder = null;
  }

  onFolderDragOver(event: DragEvent, folderId: string) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverFolder = folderId;
  }

  onFolderDragLeave(event: DragEvent, folderId: string) {
    // Only clear if we're actually leaving the collection (not moving to a child element)
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.dragOverFolder = null;
    }
  }

  onFolderDrop(event: DragEvent, folder: Folder) {
    event.preventDefault();

    if (this.draggedTable) {
      // Check if table is already in this specific folder
      if (folder.tableIds.includes(this.draggedTable.table)) {
        // Table already exists in this folder, do nothing (no notification)
        return;
      } else {
        // Simply add table to the target folder (don't remove from other folders)
        folder.tableIds.push(this.draggedTable.table);
        // Remove empty flag when adding tables via drag and drop
        if (folder.isEmpty) {
          folder.isEmpty = false;
        }
        console.log('onFolderDrop');
        this.saveFolders();
      }
    }

    this.draggedTable = null;
    this.dragOverFolder = null;
  }
}
