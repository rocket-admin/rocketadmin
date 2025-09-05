import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SsoDialogComponent } from './sso-dialog.component';

describe('SsoDialogComponent', () => {
  let component: SsoDialogComponent;
  let fixture: ComponentFixture<SsoDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SsoDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SsoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
