import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { BinaryDataCaptionFilterComponent } from './binary-data-caption.component';

describe('BinaryDataCaptionFilterComponent', () => {
  let component: BinaryDataCaptionFilterComponent;
  let fixture: ComponentFixture<BinaryDataCaptionFilterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
    imports: [BinaryDataCaptionFilterComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BinaryDataCaptionFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
