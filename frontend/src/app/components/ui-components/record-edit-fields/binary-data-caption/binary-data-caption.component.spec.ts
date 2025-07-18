import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BinaryDataCaptionEditComponent } from './binary-data-caption.component';

describe('BinaryDataCaptionEditComponent', () => {
  let component: BinaryDataCaptionEditComponent;
  let fixture: ComponentFixture<BinaryDataCaptionEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BinaryDataCaptionEditComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BinaryDataCaptionEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
