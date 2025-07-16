import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageRowComponent } from './image.component';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('ImageComponent', () => {
  let component: ImageRowComponent;
  let fixture: ComponentFixture<ImageRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        FormsModule,
        ImageRowComponent,
        BrowserAnimationsModule
    ]}).compileComponents();

    fixture = TestBed.createComponent(ImageRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
