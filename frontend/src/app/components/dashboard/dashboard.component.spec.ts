import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Angulartics2, Angulartics2Module } from 'angulartics2';
import { BehaviorSubject, of } from 'rxjs';
import { AccessLevel } from 'src/app/models/user';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TableRowService } from 'src/app/services/table-row.service';
import { TablesService } from 'src/app/services/tables.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
	let component: DashboardComponent;
	let fixture: ComponentFixture<DashboardComponent>;
	let fakeTablesService;

	const fakeConnectionsSevice = {
		get currentConnectionID(): string {
			return '';
		},
		get currentConnectionAccessLevel(): AccessLevel {
			return AccessLevel.None;
		},
		getTablesFolders: () => of([]),
	};
	const fakeRouter = {
		navigate: vi.fn().mockReturnValue(Promise.resolve('')),
	};

	const fakeTables = [
		{
			table: 'actor',
			permissions: {
				visibility: true,
				readonly: false,
				add: true,
				delete: true,
				edit: true,
			},
		},
		{
			table: 'city',
			permissions: {
				visibility: true,
				readonly: false,
				add: true,
				delete: true,
				edit: true,
			},
		},
		{
			table: 'film',
			permissions: {
				visibility: true,
				readonly: false,
				add: true,
				delete: true,
				edit: true,
			},
		},
	];

	beforeEach(async () => {
		// const paramMapSubject = new BehaviorSubject(convertToParamMap({
		//   'table-name': undefined
		// }));

		const angulartics2Mock = {
			eventTrack: {
				next: () => {}, // Mocking the next method
			},
			trackLocation: () => {}, // Mocking the trackLocation method
		};

		fakeTablesService = {
			fetchTables: vi.fn().mockReturnValue(of(fakeTables)),
			fetchTablesFolders: vi.fn().mockReturnValue(of([{ category_id: 'all-tables-kitten', category_name: 'All Tables', tables: fakeTables }])),
			cast: new BehaviorSubject(''),
		};

		await TestBed.configureTestingModule({
			imports: [MatSnackBarModule, MatDialogModule, Angulartics2Module.forRoot(), DashboardComponent],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{
					provide: ConnectionsService,
					useValue: fakeConnectionsSevice,
				},
				{
					provide: TablesService,
					useValue: fakeTablesService,
				},
				{
					provide: TableRowService,
					useValue: { cast: new BehaviorSubject('') },
				},
				{
					provide: ActivatedRoute,
					useValue: {
						paramMap: of(
							convertToParamMap({
								'table-name': undefined,
							}),
						),
					},
				},
				{ provide: Router, useValue: fakeRouter },
				{ provide: Angulartics2, useValue: angulartics2Mock },
			],
		});
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(DashboardComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should get access level of current connection', () => {
		vi.spyOn(fakeConnectionsSevice, 'currentConnectionAccessLevel', 'get').mockReturnValue(AccessLevel.Readonly);
		expect(component.currentConnectionAccessLevel).toEqual('readonly');
	});

	it('should call getData and populate tables', () => {
		fakeTablesService.fetchTablesFolders.mockReturnValue(of([{ category_id: 'all-tables-kitten', category_name: 'All Tables', tables: fakeTables }]));
		component.getData();
		expect(component.allTables.length).toEqual(fakeTables.length);
		expect(component.allTables.map(t => t.table)).toEqual(fakeTables.map(t => t.table));
	});
});
