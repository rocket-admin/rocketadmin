import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { SelectRowComponent } from './select.component';

describe('SelectRowComponent', () => {
  let component: SelectRowComponent;
  let fixture: ComponentFixture<SelectRowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SelectRowComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
