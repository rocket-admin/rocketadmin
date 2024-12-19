import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileRowComponent } from './file.component';
import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';

describe('FileRowComponent', () => {
  let component: FileRowComponent;
  let fixture: ComponentFixture<FileRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        FormsModule,
        MatRadioModule,
        FileRowComponent
    ]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
