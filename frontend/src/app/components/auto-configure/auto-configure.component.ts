import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { ConfigProgress, ConfigurationStateService } from '../../services/configuration-state.service';

@Component({
	selector: 'app-auto-configure',
	templateUrl: './auto-configure.component.html',
	styleUrls: ['./auto-configure.component.css'],
	imports: [CommonModule, MatButtonModule, RouterModule],
})
export class AutoConfigureComponent implements OnInit, OnDestroy {
	private _route = inject(ActivatedRoute);
	private _router = inject(Router);
	private _configState = inject(ConfigurationStateService);

	protected connectionId = signal<string | null>(null);
	protected progress = signal<ConfigProgress | null>(null);
	protected messages = signal<string[]>(['Initializing…']);
	protected tablesConfigured = signal<Set<string>>(new Set<string>());
	protected widgetsCount = signal<number>(0);
	protected settingsCount = signal<number>(0);
	private _progressSub?: Subscription;

	protected errorText = computed(() => {
		const p = this.progress();
		if (p?.type === 'error') return p.message ?? 'Something went wrong.';
		return null;
	});

	protected done = computed(() => this.progress()?.type === 'complete');

	protected hasSummary = computed(
		() => this.done() && (this.tablesConfigured().size > 0 || this.widgetsCount() > 0 || this.settingsCount() > 0),
	);

	async ngOnInit(): Promise<void> {
		const connectionId = this._route.snapshot.paramMap.get('connection-id');
		if (!connectionId) {
			this._router.navigate(['/connections-list']);
			return;
		}

		this.connectionId.set(connectionId);
		this._progressSub = this._configState.progress$.subscribe((p) => {
			this.progress.set(p);
			if (p?.type === 'message' && p.text) this._countMessage(p.text);
			const rawIncoming =
				p?.type === 'message' && p.text
					? p.text
					: p?.type === 'complete'
						? 'All done — opening your dashboard…'
						: null;
			if (!rawIncoming) return;
			const incoming = this._humanize(rawIncoming);
			if (!incoming) return;
			const current = this.messages();
			if (current[current.length - 1] === incoming) return;
			this.messages.set([...current, incoming].slice(-5));
		});
		await this._configState.startConfiguring(connectionId);
		// Let the user read the summary chips before navigating away.
		await new Promise((resolve) => setTimeout(resolve, 1800));
		this._router.navigate(['/dashboard', connectionId]);
	}

	ngOnDestroy(): void {
		this._progressSub?.unsubscribe();
	}

	trackByIndex(index: number): number {
		return index;
	}

	private _countMessage(text: string): void {
		const widgetMatch = text.match(/^Added\s+\S+\s+widget for table "([^"]+)"/i);
		if (widgetMatch) {
			this.widgetsCount.update((n) => n + 1);
			this._addConfiguredTable(widgetMatch[1]);
			return;
		}
		const settingMatch = text.match(/^Set up settings for table "([^"]+)",\s+\S+ parameter/i);
		if (settingMatch) {
			this.settingsCount.update((n) => n + 1);
			this._addConfiguredTable(settingMatch[1]);
			return;
		}
		const defaultsMatch = text.match(/^Set up settings for table "([^"]+)" with default parameters/i);
		if (defaultsMatch) {
			this._addConfiguredTable(defaultsMatch[1]);
		}
	}

	private _addConfiguredTable(name: string): void {
		const current = this.tablesConfigured();
		if (current.has(name)) return;
		const next = new Set(current);
		next.add(name);
		this.tablesConfigured.set(next);
	}

	private _humanize(text: string): string {
		if (/^Initializing|^Starting configuration|^✓ Setup complete|^All done/i.test(text)) return text;
		if (/^Starting AI scan/i.test(text)) return 'Looking at your database…';
		if (/^Fetching tables from database/i.test(text)) return 'Reading your tables…';

		let m = text.match(/^Found (\d+) new (?:table|tables) to scan/i);
		if (m) return `Found ${m[1]} ${m[1] === '1' ? 'table' : 'tables'} to set up`;
		if (/^No new tables to scan/i.test(text)) return 'Everything is already set up';

		m = text.match(/^Inspected structure of table "([^"]+)"/i);
		if (m) return `Read structure of ${m[1]}`;

		m = text.match(/^Generating settings with AI for (\d+)/i);
		if (m) return `Choosing the best layout for ${m[1]} ${m[1] === '1' ? 'table' : 'tables'}…`;

		m = text.match(/^AI returned settings for (\d+)/i);
		if (m) return `Recommendations ready for ${m[1]} ${m[1] === '1' ? 'table' : 'tables'}`;

		m = text.match(/^Validation failed for table "([^"]+)"/i);
		if (m) return `Couldn't configure ${m[1]}, skipped it`;

		m = text.match(/^Set up settings for table "([^"]+)", display_name parameter set to "([^"]+)"/i);
		if (m) return `Renamed ${m[1]} → ${m[2]}`;

		m = text.match(/^Set up settings for table "([^"]+)", search_fields parameter set to (.+)$/i);
		if (m) return `Search by ${m[2]} in ${m[1]}`;

		m = text.match(/^Set up settings for table "([^"]+)", readonly_fields parameter set to (.+)$/i);
		if (m) return `Locked fields in ${m[1]}: ${m[2]}`;

		m = text.match(/^Set up settings for table "([^"]+)", columns_view parameter set to (.+)$/i);
		if (m) return `Showing ${m[2]} on ${m[1]} overview`;

		m = text.match(/^Set up settings for table "([^"]+)", ordering parameter set to (ASC|DESC)/i);
		if (m) return `${m[1]} sorted ${m[2].toLowerCase() === 'asc' ? 'ascending' : 'descending'} by default`;

		m = text.match(/^Set up settings for table "([^"]+)", ordering_field parameter set to "([^"]+)"/i);
		if (m) return `${m[1]} sorts by ${m[2]} by default`;

		m = text.match(/^Set up settings for table "([^"]+)", identity_column parameter set to "([^"]+)"/i);
		if (m) return `${m[1]} identified by ${m[2]}`;

		m = text.match(/^Set up settings for table "([^"]+)" with default parameters/i);
		if (m) return `${m[1]} is ready with default setup`;

		m = text.match(/^Added (\S+) widget for table "([^"]+)" on column "([^"]+)"/i);
		if (m) return this._widgetPhrase(m[1], m[2], m[3]);

		// Generic fallback for any unmatched "Set up settings ... <param> parameter ..." line
		m = text.match(/^Set up settings for table "([^"]+)", (\S+) parameter/i);
		if (m) return `${m[1]}: ${m[2].replace(/_/g, ' ')} configured`;

		return text;
	}

	private _widgetPhrase(kind: string, table: string, column: string): string {
		const ref = `${table}.${column}`;
		switch (kind.toLowerCase()) {
			case 'phone':
				return `${ref} formatted as phone numbers`;
			case 'uuid':
				return `${ref} recognized as ID`;
			case 'country':
				return `${ref} shows country flags`;
			case 'url':
				return `${ref} shown as clickable link`;
			case 'color':
				return `${ref} shows a color swatch`;
			case 'string':
				return `${ref} validates email format`;
			default:
				return `${kind} widget enabled for ${ref}`;
		}
	}
}
