import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';
import { TableRow } from '../models/table';

@Injectable({
  providedIn: 'root'
})

export class TableStateService {
  private selectedRowSubject = new BehaviorSubject<any>(null);
  cast = this.selectedRowSubject.asObservable();

  private aiPanelSubject = new BehaviorSubject<any>(null);
  aiPanelCast = this.aiPanelSubject.asObservable();

  private aiPanelExpandedSubject = new BehaviorSubject<boolean>(false);
  aiPanelExpandedCast = this.aiPanelExpandedSubject.asObservable();

  // private backUrlFilters: any;
  // private backUrlParams: any;

  private getSessionStorageItem(key: string) {
    const item = sessionStorage.getItem(key);
    if (item) {
      try {
        return JSON.parse(item);
      } catch (e) {
        console.error(`Error parsing JSON from sessionStorage for key "${key}":`, e);
        return null;
      }
    }
    return null;
  }

  private setSessionStorageItem(key: string, value: any) {
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  setBackUrlParams(pageIndex: number, pageSize: number, sortField: string, sortDirection: string) {
    console.log('setBackUrlParams', pageIndex, pageSize, sortField, sortDirection);
    const params = {
      page_index: pageIndex,
      page_size: pageSize,
      ...(sortField !== undefined && { sort_active: sortField }),
      ...(sortDirection !== undefined && { sort_direction: sortDirection.toUpperCase() })
    };
    this.setSessionStorageItem('backUrlParams', params);
  }

  getBackUrlParams() {
    return this.getSessionStorageItem('backUrlParams');
  }

  setBackUrlFilters(filters: any) {
    this.setSessionStorageItem('backUrlFilters', filters);
  }

  getBackUrlFilters() {
    return this.getSessionStorageItem('backUrlFilters');
  }

  selectRow(row: TableRow) {
    if (this.selectedRowSubject.value && JSON.stringify(this.selectedRowSubject.value.primaryKeys) === JSON.stringify(row.primaryKeys)) {
      this.selectedRowSubject.next(null);
    } else {
      this.selectedRowSubject.next(row);
      this.closeAIpanel();
    }
  }

  handleViewAIpanel() {
    this.clearSelection();
    const isOpening = !this.aiPanelSubject.value;
    this.aiPanelSubject.next(isOpening);
    if (isOpening) {
      this.restoreAIPanelExpandedState();
    } else {
      this.aiPanelExpandedSubject.next(false);
    }
  }

  clearSelection() {
    this.selectedRowSubject.next(null);
  }

  closeAIpanel() {
    this.aiPanelSubject.next(false);
    this.aiPanelExpandedSubject.next(false);
  }

  toggleAIPanelExpanded() {
    const newValue = !this.aiPanelExpandedSubject.value;
    this.aiPanelExpandedSubject.next(newValue);
    this.setSessionStorageItem('aiPanelExpanded', newValue);
  }

  restoreAIPanelExpandedState() {
    const savedState = this.getSessionStorageItem('aiPanelExpanded');
    if (savedState !== null) {
      this.aiPanelExpandedSubject.next(savedState);
    }
  }
}
