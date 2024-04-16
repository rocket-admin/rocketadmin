import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DbTableExportDialogComponent } from './db-table-export-dialog.component';

describe('DbTableExportDialogComponent', () => {
  let component: DbTableExportDialogComponent;
  let fixture: ComponentFixture<DbTableExportDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DbTableExportDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DbTableExportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
