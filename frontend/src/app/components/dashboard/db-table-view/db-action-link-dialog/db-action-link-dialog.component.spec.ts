import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { DbActionLinkDialogComponent } from './db-action-link-dialog.component';

describe('DbActionLinkDialogComponent', () => {
  let component: DbActionLinkDialogComponent;
  let fixture: ComponentFixture<DbActionLinkDialogComponent>;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        MatDialogModule,
        DbActionLinkDialogComponent
    ],
    providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: mockDialogRef }
    ]
})
    .compileComponents();

    fixture = TestBed.createComponent(DbActionLinkDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
