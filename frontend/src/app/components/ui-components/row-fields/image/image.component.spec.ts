import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageRowComponent } from './image.component';
import { FormsModule } from '@angular/forms';

describe('ImageComponent', () => {
  let component: ImageRowComponent;
  let fixture: ComponentFixture<ImageRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule
      ],
      declarations: [ImageRowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
