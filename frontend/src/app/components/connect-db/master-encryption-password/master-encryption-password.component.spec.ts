import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterEncryptionPasswordComponent } from './master-encryption-password.component';
import { Angulartics2Module } from 'angulartics2';
import { provideHttpClient } from '@angular/common/http';

describe('MasterEncryptionPasswordComponent', () => {
  let component: MasterEncryptionPasswordComponent;
  let fixture: ComponentFixture<MasterEncryptionPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        Angulartics2Module.forRoot({}),
        MasterEncryptionPasswordComponent
    ],
    providers: [provideHttpClient()]
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
