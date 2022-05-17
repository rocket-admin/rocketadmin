import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BannerComponent } from './banner.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BannerActionType, BannerType } from 'src/app/models/banner';

describe('BannerComponent', () => {
  let component: BannerComponent;
  let fixture: ComponentFixture<BannerComponent>;


  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatSnackBarModule
      ],
      declarations: [ BannerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call finction from action on banner button click', () => {
    const buttonAction = jasmine.createSpy();
    const banner = {
      id: 0,
      type: BannerType.Error,
      message: 'Error message',
      actions: [
        {
          type: BannerActionType.Button,
          caption: 'Dissmis',
          action: buttonAction
        }
      ]
    }
    component.onButtonClick(banner, banner.actions[0]);
    expect(buttonAction).toHaveBeenCalled();
  })
});

