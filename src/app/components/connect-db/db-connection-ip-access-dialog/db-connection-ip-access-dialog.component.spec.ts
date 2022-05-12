import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { DbConnectionIpAccessDialogComponent } from './db-connection-ip-access-dialog.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('DbConnectionIpAccessDialogComponent', () => {
  let component: DbConnectionIpAccessDialogComponent;
  let fixture: ComponentFixture<DbConnectionIpAccessDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DbConnectionIpAccessDialogComponent ],
      imports: [
        MatDialogModule,
        MatSnackBarModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DbConnectionIpAccessDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
