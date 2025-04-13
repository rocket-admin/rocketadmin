import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DbTableSavedFiltersDialogComponent } from './db-table-saved-filters-dialog.component';

describe('DbTableSavedFiltersDialogComponent', () => {
  let component: DbTableSavedFiltersDialogComponent;
  let fixture: ComponentFixture<DbTableSavedFiltersDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DbTableSavedFiltersDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DbTableSavedFiltersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
