import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IconPickerComponent } from './icon-picker.component';
import { MatMenuModule } from '@angular/material/menu';

describe('IconPickerComponent', () => {
  let component: IconPickerComponent;
  let fixture: ComponentFixture<IconPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IconPickerComponent ],
      imports: [
        MatMenuModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IconPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
