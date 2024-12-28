import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterEncryptionPasswordComponent } from './master-encryption-password.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Angulartics2Module } from 'angulartics2';

describe('MasterEncryptionPasswordComponent', () => {
  let component: MasterEncryptionPasswordComponent;
  let fixture: ComponentFixture<MasterEncryptionPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        provideHttpClientTesting,
        Angulartics2Module.forRoot({}),
        MasterEncryptionPasswordComponent
    ],
})
    .compileComponents();

    fixture = TestBed.createComponent(MasterEncryptionPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
