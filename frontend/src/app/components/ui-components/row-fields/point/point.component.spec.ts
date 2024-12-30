import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PointRowComponent } from './point.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('PointRowComponent', () => {
  let component: PointRowComponent;
  let fixture: ComponentFixture<PointRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PointRowComponent, BrowserAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PointRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
