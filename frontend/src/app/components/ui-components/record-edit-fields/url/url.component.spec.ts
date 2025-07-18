import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { UrlEditComponent } from './url.component';
import { FormsModule } from '@angular/forms';

describe('UrlComponent', () => {
  let component: UrlEditComponent;
  let fixture: ComponentFixture<UrlEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        FormsModule,
        UrlEditComponent,
        BrowserAnimationsModule
    ]
  }).compileComponents();

    fixture = TestBed.createComponent(UrlEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
