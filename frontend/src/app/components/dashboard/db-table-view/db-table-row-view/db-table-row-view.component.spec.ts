import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { DbTableRowViewComponent } from './db-table-row-view.component';

describe('DbTableRowViewComponent', () => {
	let component: DbTableRowViewComponent;
	let fixture: ComponentFixture<DbTableRowViewComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [MatSnackBarModule, DbTableRowViewComponent, Angulartics2Module.forRoot()],
			providers: [provideHttpClient(), { provide: ActivatedRoute, useValue: {} }],
		});
		fixture = TestBed.createComponent(DbTableRowViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
