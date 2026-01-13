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

  describe('Title extraction', () => {
    it('should extract H1 heading as title', () => {
      component.value = '# Main Title\n\nSome paragraph text here.';
      component.ngOnInit();
      expect(component.displayTitle).toBe('Main Title');
    });

    it('should extract H2 heading as title', () => {
      component.value = '## Secondary Title\n\nContent follows.';
      component.ngOnInit();
      expect(component.displayTitle).toBe('Secondary Title');
    });

    it('should prioritize heading over paragraph', () => {
      component.value = 'Some intro text\n\n# Actual Title\n\nParagraph content.';
      component.ngOnInit();
      expect(component.displayTitle).toBe('Actual Title');
    });

    it('should use first paragraph if no heading exists', () => {
      component.value = 'This is the first paragraph.\n\nThis is the second paragraph.';
      component.ngOnInit();
      expect(component.displayTitle).toBe('This is the first paragraph.');
    });

    it('should truncate long titles at 100 characters', () => {
      const longTitle = 'a'.repeat(150);
      component.value = `# ${longTitle}`;
      component.ngOnInit();
      expect(component.displayTitle).toBe('a'.repeat(100) + '...');
    });

    it('should handle markdown with bold and italic formatting', () => {
      component.value = '# **Bold** and *italic* title';
      component.ngOnInit();
      expect(component.displayTitle).toBe('**Bold** and *italic* title');
    });

    it('should handle empty markdown', () => {
      component.value = '';
      component.ngOnInit();
      expect(component.displayTitle).toBe('—');
    });

    it('should handle null/undefined markdown', () => {
      component.value = null as any;
      component.ngOnInit();
      expect(component.displayTitle).toBe('—');
    });

    it('should handle markdown with only whitespace', () => {
      component.value = '   \n\n   ';
      component.ngOnInit();
      expect(component.displayTitle).toBe('—');
    });

    it('should extract title from markdown with code blocks', () => {
      component.value = '# API Documentation\n\n```javascript\nconst x = 5;\n```';
      component.ngOnInit();
      expect(component.displayTitle).toBe('API Documentation');
    });

    it('should extract title from markdown with lists', () => {
      component.value = '# Shopping List\n\n- Item 1\n- Item 2';
      component.ngOnInit();
      expect(component.displayTitle).toBe('Shopping List');
    });
  });
});
