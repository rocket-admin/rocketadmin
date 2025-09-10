import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SsoComponent } from './sso.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, Router, RouterLink, RouterModule } from '@angular/router';
import { CompanyService } from 'src/app/services/company.service';
import { of } from 'rxjs';

describe('SsoComponent', () => {
  let component: SsoComponent;
  let fixture: ComponentFixture<SsoComponent>;
  let companyServiceSpy: jasmine.SpyObj<CompanyService>;

  const mockActivatedRoute = {
    snapshot: {
      paramMap: convertToParamMap({
        'company-id': '123'
      })
    }
  };

  // Mock router state
  const mockRouter = {
    routerState: {
      snapshot: {
        root: {
          firstChild: {
            params: {
              'company-id': '123'
            }
          }
        }
      }
    },
    navigate: jasmine.createSpy('navigate'),
    events: of(null),
    url: '/company',
    createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({}),
    serializeUrl: jasmine.createSpy('serializeUrl').and.returnValue('company')
  };

  beforeEach(async () => {
    companyServiceSpy = jasmine.createSpyObj('CompanyService', ['fetchSamlConfiguration', 'createSamlConfiguration', 'updateSamlConfiguration']);
    companyServiceSpy.fetchSamlConfiguration.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [
        SsoComponent,
        HttpClientTestingModule,
        RouterModule.forRoot([])
      ],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: CompanyService, useValue: companyServiceSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SsoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
