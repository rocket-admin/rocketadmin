import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { EnableTwoFADialogComponent } from './enable-two-fa-dialog.component';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('EnableTwoFADialogComponent', () => {
  let component: EnableTwoFADialogComponent;
  let fixture: ComponentFixture<EnableTwoFADialogComponent>;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        HttpClientTestingModule,
        // RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        FormsModule,
        MatDialogModule,
        Angulartics2Module.forRoot(),
        EnableTwoFADialogComponent,
        BrowserAnimationsModule
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
