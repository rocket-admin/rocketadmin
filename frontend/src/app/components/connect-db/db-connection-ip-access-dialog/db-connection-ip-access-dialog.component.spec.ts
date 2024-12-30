import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { DbConnectionIpAccessDialogComponent } from './db-connection-ip-access-dialog.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('DbConnectionIpAccessDialogComponent', () => {
  let component: DbConnectionIpAccessDialogComponent;
  let fixture: ComponentFixture<DbConnectionIpAccessDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        MatDialogModule,
        MatSnackBarModule,
        DbConnectionIpAccessDialogComponent
    ],
    providers: [
        { provide: MAT_DIALOG_DATA, useValue: { host: "database-2.cvfuxe8nltiq.us-east-2.rds.amazonaws.com" } },
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
