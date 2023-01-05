import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { UpgradeSuccessComponent } from './upgrade-success.component';
import { of } from 'rxjs';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('UpgradeSuccessComponent', () => {
  let component: UpgradeSuccessComponent;
  let fixture: ComponentFixture<UpgradeSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UpgradeSuccessComponent ],
      imports: [ MatSnackBarModule ],
      providers: [
        { provide: ActivatedRoute, useValue: {
          snapshot: {queryParams: {
            plan: 'free'
          }},
        }},
        // { provide: Router, useValue: routerSpy },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpgradeSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
