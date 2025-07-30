import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Angulartics2Module } from 'angulartics2';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CassandraCredentialsFormComponent } from './cassandra-credentials-form.component';
import { provideHttpClient } from '@angular/common/http';

describe('CassandraCredentialsFormComponent', () => {
  let component: CassandraCredentialsFormComponent;
  let fixture: ComponentFixture<CassandraCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        Angulartics2Module.forRoot(),
        CassandraCredentialsFormComponent
      ],
      providers: [provideHttpClient()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CassandraCredentialsFormComponent);
    component = fixture.componentInstance;

    component.connection = {
      id: "12345678"
    } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
