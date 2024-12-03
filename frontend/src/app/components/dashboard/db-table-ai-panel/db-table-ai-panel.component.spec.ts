import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DbTableAiPanelComponent } from './db-table-ai-panel.component';

describe('DbTableAiPanelComponent', () => {
  let component: DbTableAiPanelComponent;
  let fixture: ComponentFixture<DbTableAiPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DbTableAiPanelComponent]
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
