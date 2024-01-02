import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderTableDataComponent } from './placeholder-table-data.component';

describe('PlaceholderTableDataComponent', () => {
  let component: PlaceholderTableDataComponent;
  let fixture: ComponentFixture<PlaceholderTableDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlaceholderTableDataComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderTableDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
