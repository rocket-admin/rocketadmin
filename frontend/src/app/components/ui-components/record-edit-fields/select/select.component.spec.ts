import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectRowComponent } from './select.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('SelectRowComponent', () => {
  let component: SelectRowComponent;
  let fixture: ComponentFixture<SelectRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectRowComponent, BrowserAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
