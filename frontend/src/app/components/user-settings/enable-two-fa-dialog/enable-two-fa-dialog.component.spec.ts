import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnableTwoFADialogComponent } from './enable-two-fa-dialog.component';

describe('EnableTwoFADialogComponent', () => {
  let component: EnableTwoFADialogComponent;
  let fixture: ComponentFixture<EnableTwoFADialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnableTwoFADialogComponent ]
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
