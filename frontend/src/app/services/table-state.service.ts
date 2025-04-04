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
    this.aiPanelSubject.next(!this.aiPanelSubject.value);
  }

  clearSelection() {
    this.selectedRowSubject.next(null);
  }

  closeAIpanel() {
    this.aiPanelSubject.next(false);
  }
}
