import {
	AfterViewInit,
	Component,
	ElementRef,
	Input,
	OnDestroy,
	ViewChild,
	computed,
	effect,
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

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;
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
	}
	get source(): string {
		return this._source();
	}

	@ViewChild('viewport') viewportRef!: ElementRef<HTMLDivElement>;
	@ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;
	@ViewChild('minimap') minimapRef!: ElementRef<HTMLDivElement>;
	@ViewChild('minimapCanvas') minimapCanvasRef!: ElementRef<HTMLDivElement>;

	protected _source = signal('');
	protected scale = signal(1);
	protected translateX = signal(0);
	protected translateY = signal(0);
	protected isPanning = signal(false);
	protected tableSearch = signal('');
	protected sidebarOpen = signal(true);
	protected minimapOpen = signal(true);
	protected svgReady = signal(false);
	protected svgSize = signal<{ w: number; h: number }>({ w: 0, h: 0 });
	protected viewportSize = signal<{ w: number; h: number }>({ w: 0, h: 0 });
	protected minimapSize = signal<{ w: number; h: number }>({ w: 0, h: 0 });

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

	protected scaleLabel = computed(() => `${Math.round(this.scale() * 100)}%`);

	protected minimapScale = computed(() => {
		const svg = this.svgSize();
		const mm = this.minimapSize();
		if (!svg.w || !svg.h || !mm.w || !mm.h) return 0;
		const padding = 8;
		return Math.min((mm.w - padding * 2) / svg.w, (mm.h - padding * 2) / svg.h);
	});

	protected minimapCanvasTransform = computed(() => {
		const s = this.minimapScale();
		const svg = this.svgSize();
		const mm = this.minimapSize();
		if (!s) return 'translate(0,0) scale(0)';
		const tx = (mm.w - svg.w * s) / 2;
		const ty = (mm.h - svg.h * s) / 2;
		return `translate(${tx}px, ${ty}px) scale(${s})`;
	});

	protected minimapViewportRect = computed(() => {
		const s = this.scale();
		const mm = this.minimapScale();
		const svg = this.svgSize();
		const vp = this.viewportSize();
		if (!s || !mm || !svg.w || !vp.w) {
			return { x: 0, y: 0, w: 0, h: 0 };
		}
		const offsetX = (this.minimapSize().w - svg.w * mm) / 2;
		const offsetY = (this.minimapSize().h - svg.h * mm) / 2;
		const x = offsetX + (-this.translateX() / s) * mm;
		const y = offsetY + (-this.translateY() / s) * mm;
		const w = (vp.w / s) * mm;
		const h = (vp.h / s) * mm;
		return { x, y, w, h };
	});

	private _panStart = { x: 0, y: 0, tx: 0, ty: 0 };
	private _renderObserver: MutationObserver | null = null;
	private _resizeObserver: ResizeObserver | null = null;
	private _cachedSvg: SVGSVGElement | null = null;
	private _onPanMove = (e: MouseEvent) => this._handlePanMove(e);
	private _onPanEnd = () => this._handlePanEnd();
	private _onMinimapDragMove = (e: MouseEvent) => this._handleMinimapDragMove(e);
	private _onMinimapDragEnd = () => this._handleMinimapDragEnd();
	private _minimapDragging = false;

	constructor() {
		effect(() => {
			if (!this.minimapOpen() || !this._cachedSvg) return;
			queueMicrotask(() => {
				if (this._cachedSvg) this._renderMinimapClone(this._cachedSvg);
			});
		});
	}

	ngAfterViewInit(): void {
		this._observeRender();
		this._observeResize();
	}

	ngOnDestroy(): void {
		this._renderObserver?.disconnect();
		this._resizeObserver?.disconnect();
		document.removeEventListener('mousemove', this._onPanMove);
		document.removeEventListener('mouseup', this._onPanEnd);
		document.removeEventListener('mousemove', this._onMinimapDragMove);
		document.removeEventListener('mouseup', this._onMinimapDragEnd);
	}

	onZoomIn() {
		this._zoomAt(this.scale() + ZOOM_STEP);
	}

	onZoomOut() {
		this._zoomAt(this.scale() - ZOOM_STEP);
	}

	onZoomReset() {
		this.scale.set(1);
		this._centerContent();
	}

	onFitToScreen() {
		const vp = this.viewportSize();
		const svg = this.svgSize();
		if (!vp.w || !svg.w) return;
		const padding = 24;
		const fit = Math.min(
			(vp.w - padding * 2) / svg.w,
			(vp.h - padding * 2) / svg.h,
		);
		const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, fit));
		this.scale.set(newScale);
		this.translateX.set((vp.w - svg.w * newScale) / 2);
		this.translateY.set((vp.h - svg.h * newScale) / 2);
	}

	onPanStart(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('button, a, input, .schema-diagram__sidebar, .schema-diagram__minimap, .schema-diagram__toolbar')) {
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

	onMinimapMouseDown(event: MouseEvent) {
		this._minimapDragging = true;
		this._centerMinimapAt(event);
		document.addEventListener('mousemove', this._onMinimapDragMove);
		document.addEventListener('mouseup', this._onMinimapDragEnd);
		event.preventDefault();
		event.stopPropagation();
	}

	onToggleSidebar() {
		this.sidebarOpen.update(v => !v);
	}

	onToggleMinimap() {
		this.minimapOpen.update(v => !v);
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

	private _handleMinimapDragMove(event: MouseEvent) {
		if (!this._minimapDragging) return;
		this._centerMinimapAt(event);
	}

	private _handleMinimapDragEnd() {
		this._minimapDragging = false;
		document.removeEventListener('mousemove', this._onMinimapDragMove);
		document.removeEventListener('mouseup', this._onMinimapDragEnd);
	}

	private _centerMinimapAt(event: MouseEvent) {
		const minimap = this.minimapRef?.nativeElement;
		if (!minimap) return;
		const rect = minimap.getBoundingClientRect();
		const mm = this.minimapScale();
		if (!mm) return;
		const svg = this.svgSize();
		const offsetX = (rect.width - svg.w * mm) / 2;
		const offsetY = (rect.height - svg.h * mm) / 2;
		const cx = (event.clientX - rect.left - offsetX) / mm;
		const cy = (event.clientY - rect.top - offsetY) / mm;
		const vp = this.viewportSize();
		const s = this.scale();
		this.translateX.set(vp.w / 2 - cx * s);
		this.translateY.set(vp.h / 2 - cy * s);
	}

	private _zoomAt(targetScale: number, originX?: number, originY?: number) {
		const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));
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

	private _centerContent() {
		const vp = this.viewportSize();
		const svg = this.svgSize();
		const s = this.scale();
		if (!vp.w || !svg.w) return;
		this.translateX.set((vp.w - svg.w * s) / 2);
		this.translateY.set((vp.h - svg.h * s) / 2);
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
			this._renderMinimapClone(svg);
			this.svgReady.set(true);
			requestAnimationFrame(() => this.onFitToScreen());
		};
		tryAttach();
		this._renderObserver?.disconnect();
		this._renderObserver = new MutationObserver(() => tryAttach());
		this._renderObserver.observe(canvas, { childList: true, subtree: true });
	}

	private _observeResize() {
		const viewport = this.viewportRef?.nativeElement;
		const minimap = this.minimapRef?.nativeElement;
		if (!viewport) return;
		this._resizeObserver = new ResizeObserver(() => {
			const vpRect = viewport.getBoundingClientRect();
			this.viewportSize.set({ w: vpRect.width, h: vpRect.height });
			if (minimap) {
				const mmRect = minimap.getBoundingClientRect();
				this.minimapSize.set({ w: mmRect.width, h: mmRect.height });
			}
		});
		this._resizeObserver.observe(viewport);
		if (minimap) this._resizeObserver.observe(minimap);
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
			this._renderMinimapClone(svg);
		};
		measure();
		requestAnimationFrame(measure);
	}

	private _renderMinimapClone(svg: SVGSVGElement) {
		const host = this.minimapCanvasRef?.nativeElement;
		if (!host) return;
		const { w, h } = this.svgSize();
		if (!w || !h) return;
		host.innerHTML = '';
		const clone = svg.cloneNode(true) as SVGSVGElement;
		clone.removeAttribute('id');
		clone.removeAttribute('style');
		clone.style.display = 'block';
		clone.style.margin = '0';
		clone.style.pointerEvents = 'none';
		clone.setAttribute('width', String(w));
		clone.setAttribute('height', String(h));
		host.appendChild(clone);
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
