import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextRowComponent } from './text.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('TextRowComponent', () => {
  let component: TextRowComponent;
  let fixture: ComponentFixture<TextRowComponent>;

  beforeEach(async() => {
    await TestBed.configureTestingModule({
    imports: [TextRowComponent, BrowserAnimationsModule]
  }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TextRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
