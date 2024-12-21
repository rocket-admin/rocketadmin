import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileFilterComponent } from './file.component';
import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('FileFilterComponent', () => {
  let component: FileFilterComponent;
  let fixture: ComponentFixture<FileFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MatRadioModule,
        FileFilterComponent,
        BrowserAnimationsModule
     ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
