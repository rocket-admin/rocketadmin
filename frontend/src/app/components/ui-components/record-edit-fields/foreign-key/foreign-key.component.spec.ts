import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { TablesService } from 'src/app/services/tables.service';
import { ForeignKeyEditComponent } from './foreign-key.component';

describe('ForeignKeyEditComponent', () => {
	let component: ForeignKeyEditComponent;
	let fixture: ComponentFixture<ForeignKeyEditComponent>;
	let tablesService: TablesService;

	const structureNetwork = [
		{
			column_name: 'id',
			column_default: "nextval('customers_id_seq'::regclass)",
			data_type: 'integer',
			isExcluded: false,
			isSearched: false,
			auto_increment: true,
			allow_null: false,
			character_maximum_length: null,
		},
		{
			column_name: 'firstname',
			column_default: null,
			data_type: 'character varying',
			isExcluded: false,
			isSearched: false,
			auto_increment: false,
			allow_null: true,
			character_maximum_length: 30,
		},
		{
			column_name: 'lastname',
			column_default: null,
			data_type: 'character varying',
			isExcluded: false,
			isSearched: false,
			auto_increment: false,
			allow_null: true,
			character_maximum_length: 30,
		},
		{
			column_name: 'email',
			column_default: null,
			data_type: 'character varying',
			isExcluded: false,
			isSearched: false,
			auto_increment: false,
			allow_null: false,
			character_maximum_length: 30,
		},
		{
			column_name: 'age',
			column_default: null,
			data_type: 'integer',
			isExcluded: false,
			isSearched: false,
			auto_increment: false,
			allow_null: true,
			character_maximum_length: null,
		},
	];

	const usersTableNetwork = {
		rows: [
			{
				id: 33,
				firstname: 'Alex',
				lastname: 'Taylor',
				email: 'new-user-5@email.com',
				age: 24,
			},
			{
				id: 34,
				firstname: 'Alex',
				lastname: 'Johnson',
				email: 'new-user-4@email.com',
				age: 24,
			},
			{
				id: 35,
				firstname: 'Alex',
				lastname: 'Smith',
				email: 'some-new@email.com',
				age: 24,
			},
		],
		primaryColumns: [
			{
				column_name: 'id',
				data_type: 'integer',
			},
		],
		pagination: {
			total: 30,
			lastPage: 1,
			perPage: 30,
			currentPage: 1,
		},
		sortable_by: [],
		ordering: 'ASC',
		structure: structureNetwork,
		foreignKeys: [],
	};

	const fakeRelations = {
		autocomplete_columns: ['firstname', 'lastname', 'email'],
		column_name: 'userId',
		constraint_name: '',
		referenced_column_name: 'id',
		referenced_table_name: 'users',
		column_default: '',
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				MatAutocompleteModule,
				MatDialogModule,
				Angulartics2Module.forRoot(),
				ForeignKeyEditComponent,
				BrowserAnimationsModule,
			],
			providers: [provideHttpClient(), provideRouter([])],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ForeignKeyEditComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('relations', fakeRelations);
		tablesService = TestBed.inject(TablesService);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should fill initial dropdown values when identity_column is set', async () => {
		const usersTableNetworkWithIdentityColumn = { ...usersTableNetwork, identity_column: 'lastname' };

		vi.spyOn(tablesService, 'fetchTable').mockReturnValue(of(usersTableNetworkWithIdentityColumn));

		component.connectionID = '12345678';
		fixture.componentRef.setInput('value', '');

		await component.ngOnInit();
		fixture.detectChanges();

		expect(component.identityColumn).toEqual('lastname');
		expect(component.currentDisplayedString).toBeUndefined;
		expect(component.currentFieldValue).toBeUndefined;

		expect(component.suggestions()).toEqual([
			{
				displayString: 'Taylor (Alex | new-user-5@email.com)',
				primaryKeys: { id: 33 },
				fieldValue: 33,
			},
			{
				displayString: 'Johnson (Alex | new-user-4@email.com)',
				primaryKeys: { id: 34 },
				fieldValue: 34,
			},
			{
				displayString: 'Smith (Alex | some-new@email.com)',
				primaryKeys: { id: 35 },
				fieldValue: 35,
			},
		]);
	});

	it('should fill initial dropdown values when identity_column is not set', async () => {
		vi.spyOn(tablesService, 'fetchTable').mockReturnValue(of(usersTableNetwork));

		component.connectionID = '12345678';

		fixture.componentRef.setInput('value', '');

		await component.ngOnInit();
		fixture.detectChanges();

		expect(component.identityColumn).toBeUndefined;
		expect(component.currentDisplayedString).toBeUndefined;
		expect(component.currentFieldValue).toBeUndefined;

		expect(component.suggestions()).toEqual([
			{
				displayString: 'Alex | Taylor | new-user-5@email.com',
				primaryKeys: { id: 33 },
				fieldValue: 33,
			},
			{
				displayString: 'Alex | Johnson | new-user-4@email.com',
				primaryKeys: { id: 34 },
				fieldValue: 34,
			},
			{
				displayString: 'Alex | Smith | some-new@email.com',
				primaryKeys: { id: 35 },
				fieldValue: 35,
			},
		]);
	});

	it('should fill initial dropdown values when autocomplete_columns and field value is not set', async () => {
		vi.spyOn(tablesService, 'fetchTable').mockReturnValue(of(usersTableNetwork));

		component.connectionID = '12345678';
		fixture.componentRef.setInput('relations', {
			autocomplete_columns: [],
			column_name: 'userId',
			constraint_name: '',
			referenced_column_name: 'id',
			referenced_table_name: 'users',
			column_default: '',
		});
		fixture.componentRef.setInput('value', '');

		await component.ngOnInit();
		fixture.detectChanges();

		expect(component.identityColumn).toBeUndefined;
		expect(component.currentDisplayedString).toBeUndefined;
		expect(component.currentFieldValue).toBeUndefined;

		expect(component.suggestions()).toEqual([
			{
				displayString: '33 | Alex | Taylor | new-user-5@email.com | 24',
				primaryKeys: { id: 33 },
				fieldValue: 33,
			},
			{
				displayString: '34 | Alex | Johnson | new-user-4@email.com | 24',
				primaryKeys: { id: 34 },
				fieldValue: 34,
			},
			{
				displayString: '35 | Alex | Smith | some-new@email.com | 24',
				primaryKeys: { id: 35 },
				fieldValue: 35,
			},
		]);
	});

	it('should set current value if necessary row is in suggestions list', async () => {
		component.suggestions.set([
			{
				displayString: 'Alex | Taylor | new-user-5@email.com',
				primaryKeys: { id: 33 },
				fieldValue: 33,
			},
			{
				displayString: 'Alex | Johnson | new-user-4@email.com',
				primaryKeys: { id: 34 },
				fieldValue: 34,
			},
			{
				displayString: 'Alex | Smith | some-new@email.com',
				primaryKeys: { id: 35 },
				fieldValue: 35,
			},
		]);
		component.currentDisplayedString = 'Alex | Johnson | new-user-4@email.com';

		await component.fetchSuggestions();

		expect(component.currentFieldValue).toEqual(34);
	});

	it('should fetch suggestions list if user types search query and identity column is set', async () => {
		const searchSuggestionsNetwork = {
			rows: [
				{
					id: 23,
					firstname: 'John',
					lastname: 'Taylor',
					email: 'new-user-0@email.com',
					age: 24,
				},
				{
					id: 24,
					firstname: 'John',
					lastname: 'Johnson',
					email: 'new-user-1@email.com',
					age: 24,
				},
			],
			primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
			identity_column: 'lastname',
		};

		vi.spyOn(tablesService, 'fetchTable').mockReturnValue(of(searchSuggestionsNetwork));

		fixture.componentRef.setInput('relations', fakeRelations);

		component.suggestions.set([
			{
				displayString: 'Alex | Taylor | new-user-5@email.com',
				fieldValue: 33,
			},
			{
				displayString: 'Alex | Johnson | new-user-4@email.com',
				fieldValue: 34,
			},
			{
				displayString: 'Alex | Smith | some-new@email.com',
				fieldValue: 35,
			},
		]);

		component.currentDisplayedString = 'John';
		await component.fetchSuggestions();

		expect(component.suggestions()).toEqual([
			{
				displayString: 'Taylor (John | new-user-0@email.com)',
				primaryKeys: { id: 23 },
				fieldValue: 23,
			},
			{
				displayString: 'Johnson (John | new-user-1@email.com)',
				primaryKeys: { id: 24 },
				fieldValue: 24,
			},
		]);
	});

	it('should fetch suggestions list if user types search query and show No matches message if the list is empty', async () => {
		const searchSuggestionsNetwork = {
			rows: [],
		};

		vi.spyOn(tablesService, 'fetchTable').mockReturnValue(of(searchSuggestionsNetwork));

		component.suggestions.set([
			{
				displayString: 'Alex | Taylor | new-user-5@email.com',
				primaryKeys: { id: 33 },
				fieldValue: 33,
			},
			{
				displayString: 'Alex | Johnson | new-user-4@email.com',
				primaryKeys: { id: 34 },
				fieldValue: 34,
			},
			{
				displayString: 'Alex | Smith | some-new@email.com',
				primaryKeys: { id: 35 },
				fieldValue: 35,
			},
		]);

		component.currentDisplayedString = 'skjfhskjdf';
		await component.fetchSuggestions();

		expect(component.suggestions()).toEqual([
			{
				displayString: 'No field starts with "skjfhskjdf" in foreign entity.',
			},
		]);
	});

	it('should fetch suggestions list if user types search query and identity column is not set', async () => {
		const searchSuggestionsNetwork = {
			rows: [
				{
					id: 23,
					firstname: 'John',
					lastname: 'Taylor',
					email: 'new-user-0@email.com',
					age: 24,
				},
				{
					id: 24,
					firstname: 'John',
					lastname: 'Johnson',
					email: 'new-user-1@email.com',
					age: 24,
				},
			],
			primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
		};

		const fakeFetchTable = vi.spyOn(tablesService, 'fetchTable').mockReturnValue(of(searchSuggestionsNetwork));
		component.connectionID = '12345678';
		fixture.componentRef.setInput('relations', fakeRelations);

		component.suggestions.set([
			{
				displayString: 'Alex | Taylor | new-user-5@email.com',
				fieldValue: 33,
			},
			{
				displayString: 'Alex | Johnson | new-user-4@email.com',
				fieldValue: 34,
			},
			{
				displayString: 'Alex | Smith | some-new@email.com',
				fieldValue: 35,
			},
		]);

		component.currentDisplayedString = 'Alex';
		await component.fetchSuggestions();

		fixture.detectChanges();

		expect(fakeFetchTable).toHaveBeenCalledWith({
			connectionID: '12345678',
			tableName: component.relations().referenced_table_name,
			requstedPage: 1,
			chunkSize: 20,
			foreignKeyRowName: 'autocomplete',
			foreignKeyRowValue: component.currentDisplayedString,
			referencedColumn: component.relations().referenced_column_name,
		});

		expect(component.suggestions()).toEqual([
			{
				displayString: 'John | Taylor | new-user-0@email.com',
				primaryKeys: { id: 23 },
				fieldValue: 23,
			},
			{
				displayString: 'John | Johnson | new-user-1@email.com',
				primaryKeys: { id: 24 },
				fieldValue: 24,
			},
		]);
	});

	describe('nullable column', () => {
		const nullableStructure = {
			column_name: 'userId',
			column_default: null,
			data_type: 'integer',
			isExcluded: false,
			isSearched: false,
			auto_increment: false,
			allow_null: true,
			character_maximum_length: null,
		};

		it('appends a "— empty" null option when structure.allow_null is true', async () => {
			vi.spyOn(tablesService, 'fetchTable').mockReturnValue(of(usersTableNetwork));

			component.connectionID = '12345678';
			fixture.componentRef.setInput('value', '');
			fixture.componentRef.setInput('structure', nullableStructure);

			await component.ngOnInit();
			fixture.detectChanges();

			expect(component.allowsNull()).toBe(true);
			const suggestions = component.suggestions();
			expect(suggestions).toHaveLength(4);
			expect(suggestions[suggestions.length - 1]).toEqual({
				displayString: '— empty',
				fieldValue: null,
				isNullOption: true,
			});
		});

		it('appends a null option when widget_params.allow_null is true', async () => {
			vi.spyOn(tablesService, 'fetchTable').mockReturnValue(of(usersTableNetwork));

			component.connectionID = '12345678';
			fixture.componentRef.setInput('value', '');
			fixture.componentRef.setInput('widgetStructure', {
				field_name: 'userId',
				widget_type: 'Foreign_key',
				widget_params: { ...fakeRelations, allow_null: true },
				name: '',
				description: '',
			});

			await component.ngOnInit();
			fixture.detectChanges();

			expect(component.allowsNull()).toBe(true);
			const suggestions = component.suggestions();
			expect(suggestions[suggestions.length - 1].isNullOption).toBe(true);
		});

		it('does NOT append a null option when the column is not nullable', async () => {
			vi.spyOn(tablesService, 'fetchTable').mockReturnValue(of(usersTableNetwork));

			component.connectionID = '12345678';
			fixture.componentRef.setInput('value', '');
			fixture.componentRef.setInput('structure', { ...nullableStructure, allow_null: false });

			await component.ngOnInit();
			fixture.detectChanges();

			expect(component.allowsNull()).toBe(false);
			expect(component.suggestions().some((s) => s.isNullOption)).toBe(false);
		});

		it('keeps the null option present when search returns no rows', async () => {
			fixture.componentRef.setInput('structure', nullableStructure);
			component.connectionID = '12345678';

			vi.spyOn(tablesService, 'fetchTable').mockReturnValue(of({ rows: [] }));
			component.currentDisplayedString = 'nomatches';
			await component.fetchSuggestions();

			expect(component.suggestions()).toEqual([
				{ displayString: 'No field starts with "nomatches" in foreign entity.' },
				{ displayString: '— empty', fieldValue: null, isNullOption: true },
			]);
		});

		it('emits null and clears the related link when the null option is selected', () => {
			const emitSpy = vi.spyOn(component.onFieldChange, 'emit');
			component.suggestions.set([
				{ displayString: '— empty', fieldValue: null, isNullOption: true },
				{ displayString: 'Alex | Taylor', primaryKeys: { id: 33 }, fieldValue: 33 },
			]);
			component.currentFieldQueryParams = { id: 33 };
			component.currentFieldValue = 33;

			component.updateRelatedLink({ option: { value: '— empty' } } as any);

			expect(component.currentFieldValue).toBeNull();
			expect(component.currentFieldQueryParams).toBeUndefined();
			expect(emitSpy).toHaveBeenCalledWith(null);
		});

		it('fetchSuggestions emits null when the current display string matches the null option', async () => {
			const emitSpy = vi.spyOn(component.onFieldChange, 'emit');
			component.suggestions.set([
				{ displayString: '— empty', fieldValue: null, isNullOption: true },
				{ displayString: 'Alex | Taylor', primaryKeys: { id: 33 }, fieldValue: 33 },
			]);
			component.currentDisplayedString = '— empty';

			await component.fetchSuggestions();

			expect(component.currentFieldValue).toBeNull();
			expect(emitSpy).toHaveBeenCalledWith(null);
		});
	});
});
