import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BinaryDataCaptionComponent } from './binary-data-caption.component';

describe('BinaryDataCaptionComponent', () => {
  let component: BinaryDataCaptionComponent;
  let fixture: ComponentFixture<BinaryDataCaptionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BinaryDataCaptionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BinaryDataCaptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
