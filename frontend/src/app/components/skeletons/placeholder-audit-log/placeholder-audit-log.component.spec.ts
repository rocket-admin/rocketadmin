import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderAuditLogComponent } from './placeholder-audit-log.component';

describe('PlaceholderAuditLogComponent', () => {
  let component: PlaceholderAuditLogComponent;
  let fixture: ComponentFixture<PlaceholderAuditLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlaceholderAuditLogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderAuditLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
