// MIT License

// Copyright (c) 2020 Md. Abdun Nahid

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Directive, Input, OnInit, OnDestroy } from '@angular/core';
import { Sort, MatSortable } from '@angular/material/sort';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, interval, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { PageEvent } from '@angular/material/paginator';

@Directive({
  selector: '[NgMatTableQueryReflector]'
})
export class NgMatTableQueryReflectorDirective implements OnInit, OnDestroy {

  private unsubscribeAll$: Subject<any> = new Subject();

  @Input() matSortActive: string;
  @Input() matSortDirection: 'asc' | 'desc';
  @Input() dataSource: MatTableDataSource<any>;
  private _dataSourceChecker$: Subscription;

  constructor(
    private _router: Router,
    private _activatedRoute: ActivatedRoute
  ) { }

  async ngOnInit(): Promise<void> {
    await this.waitForDatasourceToLoad();
    this._initialSetup();
    this.listenToStateChangeEvents();
  }

  private _initialSetup(): void {

    const activePageQuery = this.isPageQueryActive();

    if (activePageQuery) {
      this.dataSource.paginator.pageIndex = activePageQuery.page_index;
      this.dataSource.paginator.pageSize = activePageQuery.page_size;
    }

    // Activating initial Sort
    const activeSortQuery = this.isSortQueryActive();
    if (activeSortQuery) {
      const sortActiveColumn = activeSortQuery ? (activeSortQuery.sort_direction ? activeSortQuery.sort_active : null) : this.matSortActive;
      const sortable: MatSortable = {
        id: sortActiveColumn,
        start: activeSortQuery ? (activeSortQuery.sort_direction || null) : this.matSortDirection,
        disableClear: true
      };
      this.dataSource.sort.sort(sortable);

      if (!sortActiveColumn) { return; }
      // Material Sort Issue: https://github.com/angular/components/issues/10242
      // Picked a hack from: https://github.com/angular/components/issues/10242#issuecomment-421490991
      const activeSortHeader = this.dataSource.sort.sortables.get(sortActiveColumn);
      if (!activeSortHeader) { return; }
      activeSortHeader['_setAnimationTransitionState']({
        fromState: this.dataSource.sort.direction,
        toState: 'active',
      });
    }

  }

  private isSortQueryActive(): { sort_active: string, sort_direction: 'asc' | 'desc' } {

    const queryParams = this._activatedRoute.snapshot.queryParams;

    if (queryParams.hasOwnProperty('sort_active') || queryParams.hasOwnProperty('sort_direction')) {
      return {
        sort_active: queryParams.sort_active,
        sort_direction: queryParams.sort_direction
      };
    }

    return;
  }

  private isPageQueryActive(): { page_size: number, page_index: number } {

    const queryParams = this._activatedRoute.snapshot.queryParams;

    if (queryParams.hasOwnProperty('page_size') || queryParams.hasOwnProperty('page_index')) {
      return {
        page_size: queryParams.page_size,
        page_index: queryParams.page_index
      };
    }

    return;
  }

  private listenToStateChangeEvents(): void {
    this.dataSource.sort.sortChange
      .pipe(
        takeUntil(this.unsubscribeAll$)
      )
      .subscribe((sortChange: Sort) => {
        this._applySortChangesToUrlQueryParams(sortChange);
      });

    this.dataSource.paginator.page
      .pipe(
        takeUntil(this.unsubscribeAll$)
      )
      .subscribe((pageChange: PageEvent) => {
        this._applyPageStateChangesToUrlQueryParams(pageChange);
      });
  }

  private _applySortChangesToUrlQueryParams(sortChange: Sort): void {

    const sortingAndPaginationQueryParams = {
      sort_active: sortChange.active,
      sort_direction: sortChange.direction,
    };

    this._router.navigate([], { queryParams: sortingAndPaginationQueryParams, queryParamsHandling: 'merge' });
  }

  private _applyPageStateChangesToUrlQueryParams(pageChange: PageEvent): void {

    const sortingAndPaginationQueryParams = {
      page_size: pageChange.pageSize,
      page_index: pageChange.pageIndex,
    };

    this._router.navigate([], { queryParams: sortingAndPaginationQueryParams, queryParamsHandling: 'merge' });
  }

  private waitForDatasourceToLoad(): Promise<void> {

    const titleCheckingInterval$ = interval(500);

    return new Promise((resolve) => {
      this._dataSourceChecker$ = titleCheckingInterval$.subscribe(val => {
        if (this.dataSource?.sort && this.dataSource?.paginator) {
          this._dataSourceChecker$.unsubscribe();
          return resolve();
        }
      });
    });

  }

  ngOnDestroy(): void {
    this.unsubscribeAll$.next(null);
    this.unsubscribeAll$.complete();
  }

}