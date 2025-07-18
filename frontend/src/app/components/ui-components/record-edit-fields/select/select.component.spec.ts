import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectEditComponent } from './select.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('SelectEditComponent', () => {
  let component: SelectEditComponent;
  let fixture: ComponentFixture<SelectEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectEditComponent, BrowserAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
