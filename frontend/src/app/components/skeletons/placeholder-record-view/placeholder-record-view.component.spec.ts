import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderRecordViewComponent } from './placeholder-record-view.component';

describe('PlaceholderRecordViewComponent', () => {
  let component: PlaceholderRecordViewComponent;
  let fixture: ComponentFixture<PlaceholderRecordViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaceholderRecordViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderRecordViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
