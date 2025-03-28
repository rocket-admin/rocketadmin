import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureNotificationComponent } from './feature-notification.component';

describe('FeatureNotificationComponent', () => {
  let component: FeatureNotificationComponent;
  let fixture: ComponentFixture<FeatureNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureNotificationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeatureNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
