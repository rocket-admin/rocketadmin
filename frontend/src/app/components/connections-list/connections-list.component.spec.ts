import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { ConnectionsService } from 'src/app/services/connections.service';
import { ConnectionsListComponent } from './connections-list.component';

describe('ConnectionsListComponent', () => {
	let component: ConnectionsListComponent;
	let fixture: ComponentFixture<ConnectionsListComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MatSnackBarModule, MatDialogModule, Angulartics2Module.forRoot({}), ConnectionsListComponent],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{
					provide: ConnectionsService,
					// useClass: ConnectionsServiseStub
				},
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ConnectionsListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
