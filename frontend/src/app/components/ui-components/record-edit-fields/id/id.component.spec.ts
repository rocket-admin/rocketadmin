import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormsModule } from '@angular/forms';
import { IdRowComponent } from './id.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('IdRowComponent', () => {
  let component: IdRowComponent;
  let fixture: ComponentFixture<IdRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, IdRowComponent, BrowserAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IdRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
