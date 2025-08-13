import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DbTableAiPanelComponent } from './db-table-ai-panel.component';
import { Angulartics2Module } from 'angulartics2';
import { MarkdownService } from 'ngx-markdown';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';

describe('DbTableAiPanelComponent', () => {
  let component: DbTableAiPanelComponent;
  let fixture: ComponentFixture<DbTableAiPanelComponent>;

  const mockMarkdownService = {
    parse: jasmine.createSpy('parse').and.returnValue('parsed markdown'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Angulartics2Module.forRoot(),
        DbTableAiPanelComponent,
        BrowserAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        { provide: MarkdownService, useValue: mockMarkdownService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DbTableAiPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
