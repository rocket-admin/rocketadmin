import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiKeyDeleteDialogComponent } from './api-key-delete-dialog.component';

describe('ApiKeyDeleteDialogComponent', () => {
  let component: ApiKeyDeleteDialogComponent;
  let fixture: ComponentFixture<ApiKeyDeleteDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiKeyDeleteDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ApiKeyDeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
