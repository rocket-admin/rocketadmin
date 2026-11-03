/** Values a `UiSelect`, `UiSegmented` or `UiAutocomplete` option can carry through `v-model`. */
export type SelectValue = string | number | boolean | null;

export interface SelectOption<T extends SelectValue = SelectValue> {
	value: T;
	label: string;
	disabled?: boolean;
	/**
	 * `UiSelect` only: the `<optgroup>` label this option sits under — the `mat-optgroup`
	 * replacement. Consecutive options sharing a `group` render inside one `<optgroup>`; options
	 * without one render ungrouped. Ignored by `UiSegmented`.
	 */
	group?: string;
}

/** A `UiAutocomplete` suggestion. Any value type — a foreign key's row, a country record. */
export interface AutocompleteOption<V = unknown> {
	value: V;
	label: string;
	disabled?: boolean;
}
