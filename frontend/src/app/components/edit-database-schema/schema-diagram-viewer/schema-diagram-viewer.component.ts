import {
	AfterViewInit,
	Component,
	ElementRef,
	Input,
	OnDestroy,
	ViewChild,
	computed,
	signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarkdownModule } from 'ngx-markdown';

const MIN_RELATIVE = 0.2;
const MAX_RELATIVE = 8;
const ABSOLUTE_MIN = 0.05;
const ABSOLUTE_MAX = 40;
const ZOOM_STEP = 0.25;

@Component({
	selector: 'app-schema-diagram-viewer',
	templateUrl: './schema-diagram-viewer.component.html',
	styleUrls: ['./schema-diagram-viewer.component.css'],
	imports: [
		CommonModule,
		FormsModule,
		MatButtonModule,
		MatFormFieldModule,
		MatIconModule,
		MatInputModule,
		MatTooltipModule,
		MarkdownModule,
	],
})
export class SchemaDiagramViewerComponent implements AfterViewInit, OnDestroy {
	@Input() title: string = '';
	@Input() set source(value: string) {
		const next = value ?? '';
		if (this._source() === next) return;
		this._source.set(next);
		this._cachedSvg = null;
		this.svgReady.set(false);
		this.svgSize.set({ w: 0, h: 0 });
		this.scale.set(1);
		this.baseScale.set(1);
		this.translateX.set(0);
		this.translateY.set(0);
	}
	get source(): string {
		return this._source();
	}

	@ViewChild('viewport') viewportRef!: ElementRef<HTMLDivElement>;
	@ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;

	protected _source = signal('');
	protected scale = signal(1);
	protected baseScale = signal(1);
	protected translateX = signal(0);
	protected translateY = signal(0);
	protected isPanning = signal(false);
	protected tableSearch = signal('');
	protected sidebarOpen = signal(true);
	protected svgReady = signal(false);
	protected svgSize = signal<{ w: number; h: number }>({ w: 0, h: 0 });
	protected viewportSize = signal<{ w: number; h: number }>({ w: 0, h: 0 });

	protected tables = computed(() => {
		const src = this._source()
			.replace(/^```mermaid\n?/i, '')
			.replace(/```\s*$/i, '');
		const names: string[] = [];
		const seen = new Set<string>();
		for (const rawLine of src.split('\n')) {
			const m = rawLine.match(/^\s*([A-Za-z_][\w-]*)\s*\{/);
			if (m && !seen.has(m[1])) {
				seen.add(m[1]);
				names.push(m[1]);
			}
		}
		return names.sort((a, b) => a.localeCompare(b));
	});

	protected filteredTables = computed(() => {
		const q = this.tableSearch().toLowerCase().trim();
		const list = this.tables();
		return q ? list.filter(t => t.toLowerCase().includes(q)) : list;
	});

	protected transformStyle = computed(
		() => `translate(${this.translateX()}px, ${this.translateY()}px) scale(${this.scale()})`,
	);

	protected scaleLabel = computed(() => {
		const base = this.baseScale() || 1;
		return `${Math.round((this.scale() / base) * 100)}%`;
	});

	private _panStart = { x: 0, y: 0, tx: 0, ty: 0 };
	private _renderObserver: MutationObserver | null = null;
	private _resizeObserver: ResizeObserver | null = null;
	private _cachedSvg: SVGSVGElement | null = null;
	private _onPanMove = (e: MouseEvent) => this._handlePanMove(e);
	private _onPanEnd = () => this._handlePanEnd();

	ngAfterViewInit(): void {
		this._observeRender();
		this._observeResize();
	}

	ngOnDestroy(): void {
		this._renderObserver?.disconnect();
		this._resizeObserver?.disconnect();
		document.removeEventListener('mousemove', this._onPanMove);
		document.removeEventListener('mouseup', this._onPanEnd);
	}

	onZoomIn() {
		this._zoomAt(this.scale() + this.baseScale() * ZOOM_STEP);
	}

	onZoomOut() {
		this._zoomAt(this.scale() - this.baseScale() * ZOOM_STEP);
	}

	onZoomReset() {
		this.onFitToScreen();
	}

	onFitToScreen() {
		let vp = this.viewportSize();
		if (!vp.w || !vp.h) {
			const rect = this.viewportRef?.nativeElement?.getBoundingClientRect();
			if (rect && rect.width && rect.height) {
				vp = { w: rect.width, h: rect.height };
				this.viewportSize.set(vp);
			}
		}
		const svg = this.svgSize();
		if (!vp.w || !svg.w) return;
		const padding = 24;
		const fit = Math.min(
			(vp.w - padding * 2) / svg.w,
			(vp.h - padding * 2) / svg.h,
		);
		const newScale = Math.max(ABSOLUTE_MIN, Math.min(ABSOLUTE_MAX, fit));
		this.baseScale.set(newScale);
		this.scale.set(newScale);
		this.translateX.set((vp.w - svg.w * newScale) / 2);
		this.translateY.set((vp.h - svg.h * newScale) / 2);
	}

	onPanStart(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('button, a, input, .schema-diagram__sidebar, .schema-diagram__toolbar')) {
			return;
		}
		this.isPanning.set(true);
		this._panStart = {
			x: event.clientX,
			y: event.clientY,
			tx: this.translateX(),
			ty: this.translateY(),
		};
		document.addEventListener('mousemove', this._onPanMove);
		document.addEventListener('mouseup', this._onPanEnd);
		event.preventDefault();
	}

	onWheel(event: WheelEvent) {
		event.preventDefault();
		const rect = this.viewportRef.nativeElement.getBoundingClientRect();
		const mx = event.clientX - rect.left;
		const my = event.clientY - rect.top;
		const delta = -event.deltaY * 0.0025;
		const factor = 1 + delta;
		this._zoomAt(this.scale() * factor, mx, my);
	}

	onDoubleClick(event: MouseEvent) {
		const target = event.target as Element | null;
		if (!target) return;
		const node = this._findEntityNode(target);
		if (node) this._focusElement(node);
	}

	onFocusTable(name: string) {
		const node = this._findNodeByName(name);
		if (node) this._focusElement(node);
	}

	onToggleSidebar() {
		this.sidebarOpen.update(v => !v);
	}

	private _handlePanMove(event: MouseEvent) {
		const dx = event.clientX - this._panStart.x;
		const dy = event.clientY - this._panStart.y;
		this.translateX.set(this._panStart.tx + dx);
		this.translateY.set(this._panStart.ty + dy);
	}

	private _handlePanEnd() {
		this.isPanning.set(false);
		document.removeEventListener('mousemove', this._onPanMove);
		document.removeEventListener('mouseup', this._onPanEnd);
	}

	private _zoomAt(targetScale: number, originX?: number, originY?: number) {
		const base = this.baseScale() || 1;
		const minAbs = Math.max(ABSOLUTE_MIN, base * MIN_RELATIVE);
		const maxAbs = Math.min(ABSOLUTE_MAX, base * MAX_RELATIVE);
		const clamped = Math.max(minAbs, Math.min(maxAbs, targetScale));
		const oldScale = this.scale();
		if (clamped === oldScale) return;
		const vp = this.viewportSize();
		const ox = originX ?? vp.w / 2;
		const oy = originY ?? vp.h / 2;
		const ratio = clamped / oldScale;
		this.translateX.update(tx => ox - (ox - tx) * ratio);
		this.translateY.update(ty => oy - (oy - ty) * ratio);
		this.scale.set(clamped);
	}

	private _observeRender() {
		const canvas = this.canvasRef?.nativeElement;
		if (!canvas) return;
		const tryAttach = () => {
			const svg = canvas.querySelector('svg') as SVGSVGElement | null;
			if (!svg) return;
			if (svg === this._cachedSvg) return;
			this._cachedSvg = svg;
			this._prepareSvg(svg);
			this.svgReady.set(true);
			requestAnimationFrame(() => this.onFitToScreen());
			setTimeout(() => this.onFitToScreen(), 80);
		};
		tryAttach();
		this._renderObserver?.disconnect();
		this._renderObserver = new MutationObserver(() => tryAttach());
		this._renderObserver.observe(canvas, { childList: true, subtree: true });
	}

	private _observeResize() {
		const viewport = this.viewportRef?.nativeElement;
		if (!viewport) return;
		this._resizeObserver = new ResizeObserver(() => {
			const vpRect = viewport.getBoundingClientRect();
			this.viewportSize.set({ w: vpRect.width, h: vpRect.height });
		});
		this._resizeObserver.observe(viewport);
	}

	private _prepareSvg(svg: SVGSVGElement) {
		svg.removeAttribute('style');
		svg.style.display = 'block';
		svg.style.maxWidth = 'none';
		svg.style.maxHeight = 'none';
		svg.style.height = 'auto';
		svg.style.margin = '0';

		const measure = () => {
			const rect = svg.getBoundingClientRect();
			const currentScale = this.scale() || 1;
			let width = rect.width / currentScale;
			let height = rect.height / currentScale;
			if (!width || !height) {
				const bbox = svg.getBBox();
				width = width || bbox.width || 800;
				height = height || bbox.height || 600;
			}
			this.svgSize.set({ w: width, h: height });
		};
		measure();
		requestAnimationFrame(measure);
	}

	private _findEntityNode(target: Element): SVGGraphicsElement | null {
		const selectors = [
			'g.node',
			'g.er',
			'g[id^="entity-"]',
			'g.entity',
			'g.classGroup',
		];
		for (const sel of selectors) {
			const match = target.closest(sel);
			if (match) return match as SVGGraphicsElement;
		}
		return null;
	}

	private _findNodeByName(name: string): SVGGraphicsElement | null {
		const svg = this.canvasRef?.nativeElement?.querySelector('svg');
		if (!svg) return null;
		const target = name.toLowerCase();
		const labels = svg.querySelectorAll('text, .er .entityLabel, .nodeLabel');
		let best: SVGGraphicsElement | null = null;
		labels.forEach(label => {
			if (best) return;
			const text = (label.textContent ?? '').trim().toLowerCase();
			if (text === target) {
				const node = (label.closest('g[id], g.node, g.er, g.entity') ||
					label.parentElement) as SVGGraphicsElement | null;
				if (node) best = node;
			}
		});
		return best;
	}

	private _focusElement(node: SVGGraphicsElement) {
		const viewport = this.viewportRef?.nativeElement;
		if (!viewport) return;
		const vpRect = viewport.getBoundingClientRect();
		const nodeRect = node.getBoundingClientRect();
		const targetScale = Math.max(this.scale(), 1.2);
		const ratio = targetScale / this.scale();
		const nodeCenterX = nodeRect.left - vpRect.left + nodeRect.width / 2;
		const nodeCenterY = nodeRect.top - vpRect.top + nodeRect.height / 2;
		const newCenterX = nodeCenterX * ratio + (this.translateX() * (ratio - 1));
		const newCenterY = nodeCenterY * ratio + (this.translateY() * (ratio - 1));
		this.scale.set(targetScale);
		this.translateX.update(tx => tx + (vpRect.width / 2 - newCenterX));
		this.translateY.update(ty => ty + (vpRect.height / 2 - newCenterY));
		node.classList.add('schema-diagram__highlight');
		setTimeout(() => node.classList.remove('schema-diagram__highlight'), 1600);
	}
}
