import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OracledbCredentialsFormComponent } from './oracledb-credentials-form.component';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Angulartics2Module } from 'angulartics2';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';

describe('OracledbCredentialsFormComponent', () => {
  let component: OracledbCredentialsFormComponent;
  let fixture: ComponentFixture<OracledbCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        FormsModule,
        MatCheckboxModule,
        BrowserAnimationsModule,
        Angulartics2Module.forRoot({}),
        OracledbCredentialsFormComponent
    ],
    providers: [provideHttpClient()]
})
    .compileComponents();

    fixture = TestBed.createComponent(OracledbCredentialsFormComponent);
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
