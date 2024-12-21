import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WidgetComponent } from './widget.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('WidgetComponent', () => {
  let component: WidgetComponent;
  let fixture: ComponentFixture<WidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [WidgetComponent, BrowserAnimationsModule]
})
    .compileComponents();

    fixture = TestBed.createComponent(WidgetComponent);
    component = fixture.componentInstance;

    component.widget = {
      field_name: 'password',
      widget_type: "Password",
      widget_params: "",
      name: "User Password",
      description: ""
    }

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
