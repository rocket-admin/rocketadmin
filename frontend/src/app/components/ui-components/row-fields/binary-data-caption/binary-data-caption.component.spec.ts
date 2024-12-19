import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { BinaryDataCaptionRowComponent } from './binary-data-caption.component';

describe('BinaryDataCaptionRowComponent', () => {
  let component: BinaryDataCaptionRowComponent;
  let fixture: ComponentFixture<BinaryDataCaptionRowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
    imports: [BinaryDataCaptionRowComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BinaryDataCaptionRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
