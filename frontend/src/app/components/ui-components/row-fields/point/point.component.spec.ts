import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { PointRowComponent } from './point.component';

describe('PointRowComponent', () => {
  let component: PointRowComponent;
  let fixture: ComponentFixture<PointRowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PointRowComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PointRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
