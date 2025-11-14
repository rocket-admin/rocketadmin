import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkdownDisplayComponent } from './markdown.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideMarkdown } from 'ngx-markdown';
import { provideHttpClient } from '@angular/common/http';

describe('MarkdownDisplayComponent', () => {
  let component: MarkdownDisplayComponent;
  let fixture: ComponentFixture<MarkdownDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarkdownDisplayComponent, BrowserAnimationsModule],
      providers: [
        provideHttpClient(),
        provideMarkdown()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MarkdownDisplayComponent);
    component = fixture.componentInstance;
    component.value = '# Test Markdown';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
