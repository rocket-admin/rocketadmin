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

export interface Collection {
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
  public collections: Collection[] = [];
  private editingCollectionName: string = '';
  
  // Dialog state
  public showAddTableDialogFlag: boolean = false;
  public currentCollection: Collection | null = null;
  public selectedTablesForAdd: string[] = [];
  
  // Drag and drop state
  public draggedTable: TableProperties | null = null;
  public dragOverCollection: string | null = null;
  
  // Collapsed state
  public showCollapsedTableList: boolean = false;
  public currentCollapsedCollection: Collection | null = null;

  constructor(
    private _tableState: TableStateService,
  ) { }

  ngOnInit() {
    this.foundTables = this.tables;
    this.loadCollections();
    console.log('ngOnInit - showCollapsedTableList initialized to:', this.showCollapsedTableList);
  }

  searchSubstring() {
    if (!this.substringToSearch || this.substringToSearch.trim() === '') {
      this.foundTables = this.tables;
      // Collapse all collections when search is cleared
      this.collections.forEach(collection => {
        collection.expanded = false;
      });
      return;
    }

    const searchTerm = this.substringToSearch.toLowerCase();
    
    // Get all tables that match the search (including those in collections)
    const allTables = [...this.tables];
    
    // Add tables from collections that might not be in the main tables list
    this.collections.forEach(collection => {
      collection.tableIds.forEach(tableId => {
        // Find the table object by ID
        const tableInCollection = this.tables.find(t => t.table === tableId);
        if (tableInCollection && !allTables.find(t => t.table === tableId)) {
          allTables.push(tableInCollection);
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

    // Expand all collections that contain matching tables
    this.collections.forEach(collection => {
      const collectionTables = this.getCollectionTables(collection);
      const hasMatchingTables = collectionTables.some(table => 
        this.foundTables.some(foundTable => foundTable.table === table.table)
      );
      
      if (hasMatchingTables) {
        collection.expanded = true;
      } else {
        collection.expanded = false;
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

  closeAllCollections() {
    this.collections.forEach(collection => {
      collection.expanded = false;
    });
    this.saveCollections();
  }

  onAddCollection() {
    const newCollection: Collection = {
      id: this.generateCollectionId(),
      name: `Collection ${this.collections.length + 1}`,
      expanded: false,
      editing: false,
      tableIds: []
    };
    this.collections.push(newCollection);
    this.saveCollections();
    this.startEditCollection(newCollection);
  }

  toggleCollection(collectionId: string) {
    const collection = this.collections.find(c => c.id === collectionId);
    if (collection) {
      collection.expanded = !collection.expanded;
    }
  }

  onCollapsedCollectionClick(collection: Collection) {
    console.log('Clicked on collection:', collection.name);
    
    // If clicking on the same collection that's already open, close it
    if (this.currentCollapsedCollection?.id === collection.id) {
      this.showCollapsedTableList = false;
      this.currentCollapsedCollection = null;
    } else {
      // If clicking on a different collection, open it immediately
      this.showCollapsedTableList = true;
      this.currentCollapsedCollection = collection;
    }
    
    console.log('showCollapsedTableList is now:', this.showCollapsedTableList);
    console.log('currentCollapsedCollection is now:', this.currentCollapsedCollection?.name);
  }

  getCollapsedTableList(): TableProperties[] {
    if (!this.currentCollapsedCollection) {
      console.log('No current collapsed collection');
      return [];
    }
    
    const tables = this.getCollectionTables(this.currentCollapsedCollection);
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



  startEditCollection(collection: Collection) {
    console.log('startEditCollection called for:', collection.name);
    // Cancel any other editing
    this.collections.forEach(c => c.editing = false);
    collection.editing = true;
    this.editingCollectionName = collection.name;
    console.log('Collection editing state:', collection.editing);
    
    // Focus and select the input after the view updates
    setTimeout(() => {
      const input = document.querySelector('.collection-name.editing') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  finishEditCollection(collection: Collection) {
    collection.editing = false;
    if (collection.name.trim() === '') {
      collection.name = this.editingCollectionName;
    }
    this.saveCollections();
  }

  deleteCollection(collection: Collection) {
    if (confirm(`Are you sure you want to delete the collection "${collection.name}"?`)) {
      const index = this.collections.findIndex(c => c.id === collection.id);
      if (index > -1) {
        this.collections.splice(index, 1);
        this.saveCollections();
      }
    }
  }

  onCollectionNameDoubleClick(event: Event, collection: Collection) {
    if (collection.name !== 'All Tables') {
      event.stopPropagation();
      this.startEditCollection(collection);
      
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
      const editingCollection = this.collections.find(c => c.editing);
      if (editingCollection) {
        this.finishEditCollection(editingCollection);
      }
    }
  }

  cancelEditCollection(collection: Collection) {
    collection.editing = false;
    collection.name = this.editingCollectionName;
  }

  getCollectionTables(collection: Collection): TableProperties[] {
    const collectionTables = this.tables.filter(table => collection.tableIds.includes(table.table));
    
    // If there's a search term, filter the collection tables too
    if (this.substringToSearch && this.substringToSearch.trim() !== '') {
      const searchTerm = this.substringToSearch.toLowerCase();
      return collectionTables.filter(table => 
        table.table.toLowerCase().includes(searchTerm) || 
        (table.display_name && table.display_name.toLowerCase().includes(searchTerm)) ||
        (table.normalizedTableName && table.normalizedTableName.toLowerCase().includes(searchTerm))
      );
    }
    
    return collectionTables;
  }

  getAvailableTables(collection: Collection | null): TableProperties[] {
    if (!collection) return [];
    return this.tables.filter(table => !collection.tableIds.includes(table.table));
  }

  isTableInAnyCollection(table: TableProperties): boolean {
    return this.collections.some(collection => collection.tableIds.includes(table.table));
  }

  shouldShowCollection(collection: Collection): boolean {
    // If no search term, show all collections
    if (!this.substringToSearch || this.substringToSearch.trim() === '') {
      return true;
    }
    
    // Show collection if it has tables matching the search
    const matchingTables = this.getCollectionTables(collection);
    return matchingTables.length > 0;
  }

  showAddTableDialog(collection: Collection) {
    this.currentCollection = collection;
    this.selectedTablesForAdd = [];
    this.showAddTableDialogFlag = true;
  }

  closeAddTableDialog(event?: Event) {
    if (event && event.target !== event.currentTarget) return;
    this.showAddTableDialogFlag = false;
    this.currentCollection = null;
    this.selectedTablesForAdd = [];
  }

  toggleTableSelection(tableId: string, event: any) {
    const isChecked = event.checked;
    if (isChecked) {
      if (!this.selectedTablesForAdd.includes(tableId)) {
        this.selectedTablesForAdd.push(tableId);
      }
    } else {
      this.selectedTablesForAdd = this.selectedTablesForAdd.filter(id => id !== tableId);
    }
  }

  addSelectedTablesToCollection() {
    if (!this.currentCollection) return;
    
    this.selectedTablesForAdd.forEach(tableId => {
      if (!this.currentCollection!.tableIds.includes(tableId)) {
        this.currentCollection!.tableIds.push(tableId);
      }
    });
    
    this.saveCollections();
    this.closeAddTableDialog();
  }

  removeTableFromCollection(collection: Collection, table: TableProperties, event: Event) {
    event.stopPropagation();
    collection.tableIds = collection.tableIds.filter(id => id !== table.table);
    this.saveCollections();
  }

  trackByCollectionId(index: number, collection: Collection): string {
    return collection.id;
  }

  private generateCollectionId(): string {
    return Date.now().toString();
  }

  private loadCollections() {
    const key = `collections_${this.connectionID}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        this.collections = JSON.parse(saved);
        // Reset editing state only, keep expanded state
        this.collections.forEach(c => c.editing = false);
        console.log('Collections loaded:', this.collections.map(c => ({ name: c.name, expanded: c.expanded })));
      } catch (e) {
        console.error('Error loading collections:', e);
        this.collections = [];
      }
    } else {
      console.log('No saved collections found for key:', key);
    }
    
    // Create "All Tables" collection if it doesn't exist
    const allTablesCollection = this.collections.find(c => c.name === 'All Tables');
    if (!allTablesCollection) {
      const allTablesCollection: Collection = {
        id: this.generateCollectionId(),
        name: 'All Tables',
        expanded: true,
        editing: false,
        tableIds: this.tables.map(table => table.table)
      };
      this.collections.unshift(allTablesCollection); // Add to beginning
      this.saveCollections();
    }
  }

  private saveCollections() {
    try {
      const key = `collections_${this.connectionID}`;
      localStorage.setItem(key, JSON.stringify(this.collections));
      console.log('Collections saved:', this.collections.map(c => ({ name: c.name, expanded: c.expanded })));
    } catch (e) {
      console.error('Error saving collections:', e);
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
    this.dragOverCollection = null;
  }

  onCollectionDragOver(event: DragEvent, collectionId: string) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverCollection = collectionId;
  }

  onCollectionDragLeave(event: DragEvent, collectionId: string) {
    // Only clear if we're actually leaving the collection (not moving to a child element)
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.dragOverCollection = null;
    }
  }

  onCollectionDrop(event: DragEvent, collection: Collection) {
    event.preventDefault();
    
    if (this.draggedTable) {
      if (collection.tableIds.includes(this.draggedTable.table)) {
        // Show notification that table already exists
        this.showTableExistsNotification(collection.name, this.getTableName(this.draggedTable));
      } else {
        collection.tableIds.push(this.draggedTable.table);
        this.saveCollections();
      }
    }
    
    this.draggedTable = null;
    this.dragOverCollection = null;
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
