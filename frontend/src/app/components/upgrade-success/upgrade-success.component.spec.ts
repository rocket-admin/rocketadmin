import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpgradeSuccessComponent } from './upgrade-success.component';

describe('UpgradeSuccessComponent', () => {
  let component: UpgradeSuccessComponent;
  let fixture: ComponentFixture<UpgradeSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UpgradeSuccessComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpgradeSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
