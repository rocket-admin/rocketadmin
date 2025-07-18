import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextEditComponent } from './text.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('TextEditComponent', () => {
  let component: TextEditComponent;
  let fixture: ComponentFixture<TextEditComponent>;

  beforeEach(async() => {
    await TestBed.configureTestingModule({
    imports: [TextEditComponent, BrowserAnimationsModule]
  }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TextEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
