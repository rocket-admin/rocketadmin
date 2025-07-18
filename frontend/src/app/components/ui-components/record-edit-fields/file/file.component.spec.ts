import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileEditComponent } from './file.component';
import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('FileEditComponent', () => {
  let component: FileEditComponent;
  let fixture: ComponentFixture<FileEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MatRadioModule,
        FileEditComponent,
        BrowserAnimationsModule
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
