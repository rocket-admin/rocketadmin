import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeRowComponent } from './code.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('CodeComponent', () => {
  let component: CodeRowComponent;
  let fixture: ComponentFixture<CodeRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeRowComponent, BrowserAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CodeRowComponent);
    component = fixture.componentInstance;

    component.widgetStructure = {
      widget_params: {
        language: 'css'
      }
    } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
