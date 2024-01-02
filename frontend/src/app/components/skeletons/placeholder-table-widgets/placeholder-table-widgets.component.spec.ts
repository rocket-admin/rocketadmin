import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderTableWidgetsComponent } from './placeholder-table-widgets.component';

describe('PlaceholderTableWidgetsComponent', () => {
  let component: PlaceholderTableWidgetsComponent;
  let fixture: ComponentFixture<PlaceholderTableWidgetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlaceholderTableWidgetsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderTableWidgetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
