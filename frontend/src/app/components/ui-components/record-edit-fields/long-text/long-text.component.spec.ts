import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LongTextRowComponent } from './long-text.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('LongTextRowComponent', () => {
  let component: LongTextRowComponent;
  let fixture: ComponentFixture<LongTextRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LongTextRowComponent, BrowserAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LongTextRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
