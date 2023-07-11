import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { EnableTwoFADialogComponent } from './enable-two-fa-dialog.component';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('EnableTwoFADialogComponent', () => {
  let component: EnableTwoFADialogComponent;
  let fixture: ComponentFixture<EnableTwoFADialogComponent>;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnableTwoFADialogComponent ],
      imports: [
        HttpClientTestingModule,
        // RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        FormsModule,
        MatDialogModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnableTwoFADialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
