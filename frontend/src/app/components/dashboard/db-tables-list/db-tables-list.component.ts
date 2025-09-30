import { Component, HostListener, Input, OnInit, Output, EventEmitter } from '@angular/core';

import { CommonModule } from '@angular/common';
import { ContentLoaderComponent } from '../../ui-components/content-loader/content-loader.component';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { TableProperties } from 'src/app/models/table';
import { TableStateService } from 'src/app/services/table-state.service';

export interface Folder {
  id: string;
  name: string;
  expanded: boolean;
  editing: boolean;
  tableIds: string[];
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
    RouterModule,
    ContentLoaderComponent
  ]
})
export class DbTablesListComponent implements OnInit {
  @Input() connectionID: string;
  @Input() connectionTitle: string;
  @Input() tables: TableProperties[];
  @Input() selectedTable: string;
  @Input() collapsed: boolean;
  
  @Output() expandSidebar = new EventEmitter<void>();

  public substringToSearch: string;
  public foundTables: TableProperties[];
  public folders: Folder[] = [];
  private editingFolderName: string = '';
  
  // Dialog state
  public showEditTablesDialogFlag: boolean = false;
  public currentFolder: Folder | null = null;
  
  // Drag and drop state
  public draggedTable: TableProperties | null = null;
  public dragOverFolder: string | null = null;
  
  // Collapsed state
  public showCollapsedTableList: boolean = false;
  public currentCollapsedFolder: Folder | null = null;

  constructor(
    private _tableState: TableStateService,
  ) { }

  ngOnInit() {
    this.foundTables = this.tables;
    this.loadFolders();
    console.log('ngOnInit - showCollapsedTableList initialized to:', this.showCollapsedTableList);
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

  getTableInitials(table: TableProperties) {
    const name = this.getTableName(table);
    
    // Remove common prefixes and suffixes for better initials
    let cleanName = name
      .replace(/^(tbl_|table_|tb_)/i, '') // Remove table prefixes
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
      .trim();
    
    // Split into words and take first letters
    const words = cleanName.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length >= 2) {
      // Take first letter of first two words
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    } else if (words.length === 1) {
      // For single word, take first two characters
      const word = words[0];
      if (word.length >= 2) {
        return word.substring(0, 2).toUpperCase();
      }
      return word.toUpperCase();
    }
    
    // Fallback to original logic
    if (name.length >= 2) {
      return name.substring(0, 2).toUpperCase();
    }
    return name.toUpperCase();
  }

  getTableNameLength(tableName: string) {
    return tableName.length;
  }

  closeSidebar() {
    this._tableState.clearSelection();
    this._tableState.closeAIpanel();
  }

  closeAllFolders() {
    this.folders.forEach(collection => {
      collection.expanded = false;
    });
    this.saveFolders();
  }

  onAddFolder() {
    const newFolder: Folder = {
      id: this.generateFolderId(),
      name: `Folder ${this.folders.length}`,
      expanded: false,
      editing: false,
      tableIds: []
    };
    this.folders.push(newFolder);
    this.saveFolders();
    this.startEditFolder(newFolder);
  }

  toggleFolder(folderId: string) {
    const folder = this.folders.find(f => f.id === folderId);
    if (folder) {
      folder.expanded = !folder.expanded;
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



  startEditFolder(folder: Folder) {
    console.log('startEditFolder called for:', folder.name);
    // Cancel any other editing
    this.folders.forEach(f => f.editing = false);
    folder.editing = true;
    this.editingFolderName = folder.name;
    console.log('Folder editing state:', folder.editing);
    
    // Focus and select the input after the view updates
    setTimeout(() => {
      const input = document.querySelector('.folder-name.editing') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  finishEditFolder(folder: Folder) {
    folder.editing = false;
    if (folder.name.trim() === '') {
      folder.name = this.editingFolderName;
    }
    this.saveFolders();
  }

  deleteFolder(folder: Folder) {
    if (confirm(`Are you sure you want to delete the folder "${folder.name}"?`)) {
      const index = this.folders.findIndex(f => f.id === folder.id);
      if (index > -1) {
        this.folders.splice(index, 1);
        this.saveFolders();
      }
    }
  }

  onFolderNameDoubleClick(event: Event, folder: Folder) {
    if (folder.name !== 'All Tables') {
      event.stopPropagation();
      this.startEditFolder(folder);
      
      // Close any open menus after starting edit
      setTimeout(() => {
        const menus = document.querySelectorAll('.mat-mdc-menu-content');
        menus.forEach(menu => {
          const menuElement = menu as HTMLElement;
          if (menuElement.style.display !== 'none') {
            menuElement.style.display = 'none';
          }
        });
      }, 0);
    }
  }

  onMenuClosed() {
    // Menu closed, no action needed
  }

  closeMenu(menu: any) {
    if (menu && menu.close) {
      menu.close();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Check if click is outside any editing collection
    const target = event.target as HTMLElement;
    const isEditingInput = target.closest('.collection-name-edit-container');
    const isEditButton = target.closest('.edit-collection-button');
    
    if (!isEditingInput && !isEditButton) {
      // Find any collection that is currently being edited
      const editingFolder = this.folders.find(c => c.editing);
      if (editingFolder) {
        this.finishEditFolder(editingFolder);
      }
    }
  }

  cancelEditFolder(folder: Folder) {
    folder.editing = false;
    folder.name = this.editingFolderName;
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
    this.currentFolder = folder;
    this.showEditTablesDialogFlag = true;
  }

  closeEditTablesDialog(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.showEditTablesDialogFlag = false;
    this.currentFolder = null;
  }

  get allTables(): TableProperties[] {
    return this.tables;
  }

  isTableInFolder(table: TableProperties): boolean {
    return this.currentFolder ? this.currentFolder.tableIds.includes(table.table) : false;
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
    }

    this.saveFolders();
  }


  removeTableFromFolder(folder: Folder, table: TableProperties, event: Event) {
    event.stopPropagation();
    folder.tableIds = folder.tableIds.filter(id => id !== table.table);
    this.saveFolders();
  }

  trackByFolderId(index: number, folder: Folder): string {
    return folder.id;
  }

  private generateFolderId(): string {
    return Date.now().toString();
  }

  private loadFolders() {
    const key = `folders_${this.connectionID}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        this.folders = JSON.parse(saved);
        // Reset editing state only, keep expanded state
        this.folders.forEach(c => c.editing = false);
        console.log('Folders loaded:', this.folders.map(c => ({ name: c.name, expanded: c.expanded })));
      } catch (e) {
        console.error('Error loading folders:', e);
        this.folders = [];
      }
    } else {
      console.log('No saved folders found for key:', key);
    }
    
    // Create "All Tables" collection if it doesn't exist
    const allTablesFolder = this.folders.find(c => c.name === 'All Tables');
    if (!allTablesFolder) {
      const allTablesFolder: Folder = {
        id: this.generateFolderId(),
        name: 'All Tables',
        expanded: true,
        editing: false,
        tableIds: this.tables.map(table => table.table)
      };
      this.folders.unshift(allTablesFolder); // Add to beginning
      this.saveFolders();
    }
  }

  private saveFolders() {
    try {
      const key = `folders_${this.connectionID}`;
      localStorage.setItem(key, JSON.stringify(this.folders));
      console.log('Folders saved:', this.folders.map(c => ({ name: c.name, expanded: c.expanded })));
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
      if (folder.tableIds.includes(this.draggedTable.table)) {
        // Show notification that table already exists
        this.showTableExistsNotification(folder.name, this.getTableName(this.draggedTable));
      } else {
        folder.tableIds.push(this.draggedTable.table);
        this.saveFolders();
      }
    }
    
    this.draggedTable = null;
    this.dragOverFolder = null;
  }

  private showTableExistsNotification(collectionName: string, tableName: string) {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'table-exists-notification';
    notification.textContent = `"${tableName}" already exists in "${collectionName}"`;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff9800;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 300);
    }, 3000);
  }
}
