import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderRowEditComponent } from './placeholder-row-edit.component';

describe('PlaceholderRowEditComponent', () => {
  let component: PlaceholderRowEditComponent;
  let fixture: ComponentFixture<PlaceholderRowEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlaceholderRowEditComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderRowEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
