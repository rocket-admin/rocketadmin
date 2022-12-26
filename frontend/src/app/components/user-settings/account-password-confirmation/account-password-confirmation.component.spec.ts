import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountPasswordConfirmationComponent } from './account-password-confirmation.component';

describe('AccountPasswordConfirmationComponent', () => {
  let component: AccountPasswordConfirmationComponent;
  let fixture: ComponentFixture<AccountPasswordConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountPasswordConfirmationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountPasswordConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
