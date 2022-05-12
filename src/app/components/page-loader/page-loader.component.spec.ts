import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { PageLoaderComponent } from './page-loader.component';
import { RouterTestingModule } from "@angular/router/testing";

describe('LoaderComponent', () => {
  let component: PageLoaderComponent;
  let fixture: ComponentFixture<PageLoaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PageLoaderComponent ],
      imports: [ RouterTestingModule.withRoutes([]) ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PageLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
