import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiKeyDeleteDialogComponent } from './api-key-delete-dialog.component';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ApiKeyDeleteDialogComponent', () => {
  let component: ApiKeyDeleteDialogComponent;
  let fixture: ComponentFixture<ApiKeyDeleteDialogComponent>;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatDialogModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: mockDialogRef }
      ],
      declarations: [ApiKeyDeleteDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApiKeyDeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
