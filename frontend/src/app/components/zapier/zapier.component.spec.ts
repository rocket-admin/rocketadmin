import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZapierComponent } from './zapier.component';

describe('ZapierComponent', () => {
  let component: ZapierComponent;
  let fixture: ComponentFixture<ZapierComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZapierComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZapierComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
