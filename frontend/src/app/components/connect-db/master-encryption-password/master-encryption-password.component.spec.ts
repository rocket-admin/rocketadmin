import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterEncryptionPasswordComponent } from './master-encryption-password.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('MasterEncryptionPasswordComponent', () => {
  let component: MasterEncryptionPasswordComponent;
  let fixture: ComponentFixture<MasterEncryptionPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MasterEncryptionPasswordComponent],
      imports: [
        HttpClientTestingModule
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
