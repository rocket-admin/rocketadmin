import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UrlRowComponent } from './url.component';
import { FormsModule } from '@angular/forms';

describe('UrlComponent', () => {
  let component: UrlRowComponent;
  let fixture: ComponentFixture<UrlRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        FormsModule,
        UrlRowComponent
    ]
})
    .compileComponents();

    fixture = TestBed.createComponent(UrlRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
