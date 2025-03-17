import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteDomainDialogComponent } from './delete-domain-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { Angulartics2Module } from 'angulartics2';

describe('DeleteDomainDialogComponent', () => {
  let component: DeleteDomainDialogComponent;
  let fixture: ComponentFixture<DeleteDomainDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Angulartics2Module.forRoot(),
        DeleteDomainDialogComponent
      ],
      providers: [
        provideHttpClient(),
        { provide: MAT_DIALOG_DATA, useValue: {
          companyId: '',
          domain: ''
        }},
        { provide: MatDialogRef, useValue: MatDialogRef }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteDomainDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
