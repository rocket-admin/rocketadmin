import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeRowComponent } from './code.component';

describe('CodeComponent', () => {
  let component: CodeRowComponent;
  let fixture: ComponentFixture<CodeRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeRowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodeRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
