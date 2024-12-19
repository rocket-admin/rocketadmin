import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DbTableAiPanelComponent } from './db-table-ai-panel.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Angulartics2Module } from 'angulartics2';
import { MarkdownService } from 'ngx-markdown';

describe('DbTableAiPanelComponent', () => {
  let component: DbTableAiPanelComponent;
  let fixture: ComponentFixture<DbTableAiPanelComponent>;

  const mockMarkdownService = {
    parse: jasmine.createSpy('parse').and.returnValue('parsed markdown'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        HttpClientTestingModule,
        Angulartics2Module.forRoot(),
        DbTableAiPanelComponent
    ],
    providers: [
        { provide: MarkdownService, useValue: mockMarkdownService },
    ]
})
    .compileComponents();

    fixture = TestBed.createComponent(DbTableAiPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
