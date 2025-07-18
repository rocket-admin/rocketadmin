import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormsModule } from '@angular/forms';
import { IdEditComponent } from './id.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('IdEditComponent', () => {
  let component: IdEditComponent;
  let fixture: ComponentFixture<IdEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, IdEditComponent, BrowserAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IdEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
