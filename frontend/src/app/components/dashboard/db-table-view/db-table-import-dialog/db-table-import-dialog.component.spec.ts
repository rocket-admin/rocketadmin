import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DbTableImportDialogComponent } from './db-table-import-dialog.component';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { Angulartics2Module } from 'angulartics2';
import { provideHttpClient } from '@angular/common/http';

describe('DbTableImportDialogComponent', () => {
  let component: DbTableImportDialogComponent;
  let fixture: ComponentFixture<DbTableImportDialogComponent>;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
      MatDialogModule,
      MatSnackBarModule,
      FormsModule,
      Angulartics2Module.forRoot(),
      DbTableImportDialogComponent
    ],
    providers: [
      provideHttpClient(),
      { provide: MAT_DIALOG_DATA, useValue: {
          connectionID: '12345678',
          tableName: 'users',
          sortColumn: 'first_name',
          sortOrder: 'asc',
          filters: { first_name: { startswith: 'A' } },
          search: ''
      }},
      { provide: MatDialogRef, useValue: mockDialogRef },
    ]
  }).compileComponents();

    fixture = TestBed.createComponent(DbTableImportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
