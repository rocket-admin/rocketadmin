// The shared part of the per-database credentials forms (port of BaseCredentialsFormComponent).
//
// Every form takes the same props and emits the same events; it calls `provideCredentialsForm()`
// once and the field components below it (CredentialsTextField, CredentialsHostField, …) read the
// connection, the touched/dirty state and the analytics helper from the injected context.
//
// The connection is the page's reactive draft and the fields write into it directly, as the
// Angular forms did through `[(ngModel)]="connection.host"`.
import { type ComputedRef, computed, type InjectionKey, inject, provide, reactive } from 'vue';
import type { Connection } from '@/models/connection';
import type { AccessLevel } from '@/models/user';
import { trackConnectionEvent } from '../analytics';

export interface CredentialsFormProps {
	/** The draft being edited; fields write into it. */
	connection: Connection;
	/** Saved connection the user may only read (readonly access or a test connection). */
	readonly?: boolean;
	submitting?: boolean;
	masterKey?: string | null;
	accessLevel?: AccessLevel | null;
	/** Fields filled from a pasted connection string; they get the "autofilled" look. */
	autoFilledFields?: Set<string>;
	/** A submit was attempted: every field shows its error, as a submitted NgForm did. */
	submitted?: boolean;
}

export interface CredentialsFormEmits {
	switchToAgent: [];
	masterKeyChange: [key: string];
	fieldChange: [field: string];
}

type Emit = {
	(event: 'switchToAgent'): void;
	(event: 'masterKeyChange', key: string): void;
	(event: 'fieldChange', field: string): void;
};

/** Connection fields the forms bind to a text input. */
export type CredentialsTextKey =
	| 'host'
	| 'port'
	| 'username'
	| 'password'
	| 'database'
	| 'schema'
	| 'authSource'
	| 'dataCenter'
	| 'sid'
	| 'privateSSHKey'
	| 'sshHost'
	| 'sshPort'
	| 'sshUsername'
	| 'cert';

export interface CredentialsFormOptions {
	/** Cassandra's form ends its messages with a period ("Port should not be empty."). */
	periods?: boolean;
}

export interface CredentialsFormContext {
	props: CredentialsFormProps;
	connection: ComputedRef<Connection>;
	/** 'edit' for a saved connection, 'add' for a new one (the analytics wording). */
	mode: ComputedRef<'edit' | 'add'>;
	/** SSH/SSL fields: readonly for readonly users on a saved connection (test connections may edit them). */
	sshReadonly: ComputedRef<boolean>;
	periods: boolean;
	touch(name: string): void;
	markDirty(name: string): void;
	isTouched(name: string): boolean;
	isDirty(name: string): boolean;
	/** Errors show once the field was left or a submit was attempted (mat-error's rule). */
	showErrors(name: string): boolean;
	isAutoFilled(key: string): boolean;
	/** The user edited an autofilled field: it stops being autofilled. */
	clearAutoFilled(key: string): void;
	switchToAgent(): void;
	setMasterKey(key: string): void;
	/** Sends "Connection creds <edit|add>: <what>". */
	track(what: string, properties?: Record<string, unknown>): void;
	/** Appends the form's sentence period to a message. */
	sentence(message: string): string;
	getText(key: CredentialsTextKey): string;
	setText(key: CredentialsTextKey, value: string): void;
}

const CREDENTIALS_FORM: InjectionKey<CredentialsFormContext> = Symbol('CredentialsForm');

export function provideCredentialsForm(
	props: CredentialsFormProps,
	emit: Emit,
	options: CredentialsFormOptions = {},
): CredentialsFormContext {
	const touched = reactive(new Set<string>());
	const dirty = reactive(new Set<string>());
	const connection = computed(() => props.connection);
	const mode = computed(() => (props.connection.id ? 'edit' : 'add'));
	const periods = options.periods ?? false;

	const context: CredentialsFormContext = {
		props,
		connection,
		mode,
		sshReadonly: computed(() => props.accessLevel === 'readonly' && Boolean(props.connection.id)),
		periods,
		touch: (name) => touched.add(name),
		markDirty: (name) => dirty.add(name),
		isTouched: (name) => touched.has(name),
		isDirty: (name) => dirty.has(name),
		showErrors: (name) => Boolean(props.submitted) || touched.has(name),
		isAutoFilled: (key) => props.autoFilledFields?.has(key) ?? false,
		clearAutoFilled: (key) => emit('fieldChange', key),
		switchToAgent: () => emit('switchToAgent'),
		setMasterKey: (key) => emit('masterKeyChange', key),
		track: (what, properties) => trackConnectionEvent(`Connection creds ${mode.value}: ${what}`, properties),
		sentence: (message) => (periods ? `${message}.` : message),
		getText: (key) => {
			const value = props.connection[key];
			return value === null || value === undefined ? '' : String(value);
		},
		setText: (key, value) => {
			(props.connection as Record<CredentialsTextKey, string | null | undefined>)[key] = value;
		},
	};
	provide(CREDENTIALS_FORM, context);
	return context;
}

export function useCredentialsForm(): CredentialsFormContext {
	const context = inject(CREDENTIALS_FORM, null);
	if (!context) throw new Error('Credentials fields must be used inside a form that calls provideCredentialsForm()');
	return context;
}
