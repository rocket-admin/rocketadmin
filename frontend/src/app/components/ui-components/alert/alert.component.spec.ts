import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AlertActionType, AlertType } from 'src/app/models/alert';
import { AlertComponent } from './alert.component';

describe('AlertComponent', () => {
	let component: AlertComponent;
	let fixture: ComponentFixture<AlertComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MatSnackBarModule, AlertComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(AlertComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should call finction from action on alert button click', () => {
		const buttonAction = vi.fn();
		const alert = {
			id: 0,
			type: AlertType.Error,
			message: 'Error message',
			actions: [
				{
					type: AlertActionType.Button,
					caption: 'Dissmis',
					action: buttonAction,
				},
			],
		};
		component.onButtonClick(alert, alert.actions[0]);
		expect(buttonAction).toHaveBeenCalled();
	});
});
