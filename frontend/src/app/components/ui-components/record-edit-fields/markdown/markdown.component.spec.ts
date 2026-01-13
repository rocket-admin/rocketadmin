import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkdownEditComponent } from './markdown.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';

describe('MarkdownEditComponent', () => {
  let component: MarkdownEditComponent;
  let fixture: ComponentFixture<MarkdownEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarkdownEditComponent, BrowserAnimationsModule],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(MarkdownEditComponent);
    component = fixture.componentInstance;

    component.widgetStructure = {
      widget_params: {}
    } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
