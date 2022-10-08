import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserDeletedSuccessComponent } from './user-deleted-success.component';

describe('UserDeletedSuccessComponent', () => {
  let component: UserDeletedSuccessComponent;
  let fixture: ComponentFixture<UserDeletedSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UserDeletedSuccessComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserDeletedSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
