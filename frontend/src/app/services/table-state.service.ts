import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';
import { TableRow } from '../models/table';

@Injectable({
  providedIn: 'root'
})

export class TableStateService {
  private selectedRowSubject = new BehaviorSubject<any>(null);
  cast = this.selectedRowSubject.asObservable();

  private backUrlFilters: any;
  private backUrlParams: any;

  setBackUrlParams(pageIndex, pageSize, sortField, sortDirection) {
    this.backUrlParams = {
      page_index: pageIndex,
      page_size: pageSize,
      sort_active: sortField,
      sort_direction: sortDirection
    };
  }

  getBackUrlParams() {
    return this.backUrlParams;
  }

  setBackUrlFilters(filters: any) {
    this.backUrlFilters = filters;
  }

  getBackUrlFilters() {
    return this.backUrlFilters;
  }

  selectRow(row: TableRow) {
    if (this.selectedRowSubject.value && JSON.stringify(this.selectedRowSubject.value.primaryKeys) === JSON.stringify(row.primaryKeys)) {
      this.selectedRowSubject.next(null);
    } else {
      this.selectedRowSubject.next(row);
    }
  }

  clearSelection() {
    this.selectedRowSubject.next(null);
  }
}
