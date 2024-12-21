import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaticTextRowComponent } from './static-text.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('StaticTextRowComponent', () => {
  let component: StaticTextRowComponent;
  let fixture: ComponentFixture<StaticTextRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaticTextRowComponent, BrowserAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StaticTextRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
