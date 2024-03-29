import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { StaticTextRowComponent } from './static-text.component';

describe('StaticTextRowComponent', () => {
  let component: StaticTextRowComponent;
  let fixture: ComponentFixture<StaticTextRowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StaticTextRowComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StaticTextRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
