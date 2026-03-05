import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Angulartics2OnModule } from 'angulartics2';
import posthog from 'posthog-js';

@Component({
	selector: 'app-widgets-empty-state',
	templateUrl: './widgets-empty-state.component.html',
	styleUrls: ['./widgets-empty-state.component.css'],
	imports: [CommonModule, MatButtonModule, MatIconModule, Angulartics2OnModule],
})
export class WidgetsEmptyStateComponent implements OnInit, OnDestroy {
	protected posthog = posthog;

	@Output() onAddWidget = new EventEmitter<void>();

	public animatedRows: boolean[] = [false, false, false, false];

	ngOnInit(): void {
		this._startWidgetAnimation();
	}

	ngOnDestroy(): void {
		this._clearAnimationTimers();
	}

	private _animationTimers: ReturnType<typeof setTimeout>[] = [];

	private _startWidgetAnimation(): void {
		this._clearAnimationTimers();
		this._runAnimationCycle();
	}

	private _runAnimationCycle(): void {
		for (let i = 0; i < 4; i++) {
			this._animationTimers.push(
				setTimeout(() => {
					this.animatedRows[i] = true;
				}, i * 600),
			);
		}

		this._animationTimers.push(
			setTimeout(
				() => {
					this.animatedRows = [false, false, false, false];

					this._animationTimers.push(
						setTimeout(() => {
							this._runAnimationCycle();
						}, 800),
					);
				},
				3 * 600 + 2200,
			),
		);
	}

	private _clearAnimationTimers(): void {
		this._animationTimers.forEach((t) => clearTimeout(t));
		this._animationTimers = [];
	}
}
