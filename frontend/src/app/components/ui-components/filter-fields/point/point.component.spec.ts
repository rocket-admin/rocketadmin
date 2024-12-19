import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { PointFilterComponent } from './point.component';

describe('PointFilterComponent', () => {
  let component: PointFilterComponent;
  let fixture: ComponentFixture<PointFilterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
    imports: [PointFilterComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PointFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
