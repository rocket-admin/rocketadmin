<script setup lang="ts">
// Port of FeatureNotificationComponent: the one-off "what's new" card shown until dismissed
// (see CURRENT_FEATURE_NOTIFICATION_ID in useAppSession). The animation's colours are palette tokens.
import { UiButton } from '@/components/ui';

const emit = defineEmits<{ dismiss: [] }>();
</script>

<template>
	<section class="feature-notification" aria-labelledby="feature-notification-title">
		<div class="feature-notification__animation" aria-hidden="true">
			<svg viewBox="0 0 360 180" class="fn-svg">
				<defs>
					<pattern id="fn-grid" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
						<circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.12" />
					</pattern>
					<linearGradient id="fn-bg" x1="0" y1="0" x2="1" y2="1">
						<stop offset="0%" style="stop-color: var(--color-paper-2)" />
						<stop offset="100%" style="stop-color: var(--color-paper)" />
					</linearGradient>
					<clipPath id="fn-typing-clip">
						<rect class="fn-typing-clip" x="32" y="142" width="0" height="24" />
					</clipPath>
				</defs>

				<rect class="fn-bg" width="360" height="180" rx="8" fill="url(#fn-bg)" />
				<rect width="360" height="180" rx="8" fill="url(#fn-grid)" />

				<!-- ============================================== -->
				<!-- ACT 1 (0–1.5s): "+ Create" button only          -->
				<!-- ============================================== -->
				<g class="fn-act fn-act--1">
					<!-- Create button (dark) -->
					<g class="fn-add-button">
						<rect x="130" y="74" width="100" height="40" rx="20" style="fill: var(--color-ink)" />
						<text x="180" y="100" text-anchor="middle" font-size="14" font-weight="500" font-family="system-ui, sans-serif" style="fill: var(--color-surface)">+ Create</text>
					</g>

					<!-- Click ripple -->
					<circle class="fn-click-ripple" cx="180" cy="93" r="0" fill="none" stroke-width="1.5" style="stroke: var(--color-accent)" />

					<!-- Cursor for act 1 -->
					<g class="fn-pointer-1">
						<path d="M0 0 L0 14 L4 11 L7 17 L10 16 L7 9 L12 9 Z" stroke-width="1" style="fill: var(--color-ink); stroke: var(--color-surface)" />
					</g>
				</g>

				<!-- ============================================== -->
				<!-- ACT 2 (1.5–3.5s): chat with typed prompt        -->
				<!-- ============================================== -->
				<g class="fn-act fn-act--2">
					<!-- Header -->
					<text class="fn-chat-title fn-chat-title--initial" x="20" y="24" font-size="13" font-weight="600" font-family="system-ui, sans-serif" style="fill: var(--color-ink)">New database</text>
					<text class="fn-chat-title fn-chat-title--final" x="20" y="24" font-size="13" font-weight="600" font-family="system-ui, sans-serif" style="fill: var(--color-ink)">Bookings for climbing gym</text>
					<line class="fn-chat-divider" x1="20" y1="34" x2="340" y2="34" stroke-width="0.8" style="stroke: var(--color-line)" />

					<!-- Input field -->
					<g class="fn-input">
						<rect x="20" y="136" width="320" height="30" rx="15" stroke-width="1" style="fill: var(--color-surface); stroke: var(--color-line)" />
						<g clip-path="url(#fn-typing-clip)">
							<text x="34" y="158" font-size="16" font-family="ui-monospace, SFMono-Regular, monospace" style="fill: var(--color-ink)">Bookings for climbing gym</text>
						</g>
						<rect class="fn-caret" x="34" y="144" width="1.6" height="18" style="fill: var(--color-ink)" />
						<!-- Send button -->
						<g class="fn-send-button">
							<circle cx="326" cy="151" r="11" style="fill: var(--color-accent)" />
							<path d="M321 154 L326 147 L331 154 M326 147 L326 159" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke: var(--color-surface)" />
						</g>
					</g>

				</g>

				<!-- ============================================== -->
				<!-- ACT 3 (3.5–5.5s): AI reply with diagram         -->
				<!-- ============================================== -->
				<g class="fn-act fn-act--3">
					<!-- AI avatar (lifted above the diagram) -->
					<g class="fn-ai-avatar">
						<circle cx="22" cy="50" r="10" style="fill: var(--color-paper-2)" />
						<path d="M22 43.5 L23.4 47.6 L27.5 49 L23.4 50.4 L22 54.5 L20.6 50.4 L16.5 49 L20.6 47.6 Z" style="fill: var(--color-accent)" />
					</g>

					<!-- Mini diagram (3 tables) -->
					<g class="fn-table fn-table--1">
						<rect x="18" y="74" width="102" height="66" rx="7" stroke-width="1.2" style="fill: var(--color-surface); stroke: var(--color-line)" />
						<rect x="18" y="74" width="102" height="18" rx="7" style="fill: var(--color-accent)" />
						<text x="28" y="87" font-size="12" font-weight="600" font-family="system-ui, sans-serif" style="fill: var(--color-surface)">members</text>
						<text x="28" y="106" font-size="10" font-family="system-ui, sans-serif" style="fill: var(--color-ink-soft)">id</text>
						<text x="112" y="106" font-size="8" font-weight="700" font-family="system-ui, sans-serif" text-anchor="end" style="fill: var(--color-warning)">PK</text>
						<text x="28" y="120" font-size="10" font-family="system-ui, sans-serif" style="fill: var(--color-ink-soft)">name</text>
						<text x="28" y="134" font-size="10" font-family="system-ui, sans-serif" style="fill: var(--color-ink-soft)">email</text>
					</g>

					<g class="fn-table fn-table--2">
						<rect x="130" y="58" width="102" height="66" rx="7" stroke-width="1.2" style="fill: var(--color-surface); stroke: var(--color-line)" />
						<rect x="130" y="58" width="102" height="18" rx="7" style="fill: var(--color-hot)" />
						<text x="140" y="71" font-size="12" font-weight="600" font-family="system-ui, sans-serif" style="fill: var(--color-surface)">bookings</text>
						<text x="140" y="90" font-size="10" font-family="system-ui, sans-serif" style="fill: var(--color-ink-soft)">id</text>
						<text x="224" y="90" font-size="8" font-weight="700" font-family="system-ui, sans-serif" text-anchor="end" style="fill: var(--color-warning)">PK</text>
						<text x="140" y="104" font-size="10" font-family="system-ui, sans-serif" style="fill: var(--color-ink-soft)">member_id</text>
						<text x="224" y="104" font-size="8" font-weight="700" font-family="system-ui, sans-serif" text-anchor="end" style="fill: var(--color-accent)">FK</text>
						<text x="140" y="118" font-size="10" font-family="system-ui, sans-serif" style="fill: var(--color-ink-soft)">date</text>
					</g>

					<g class="fn-table fn-table--3">
						<rect x="242" y="78" width="102" height="62" rx="7" stroke-width="1.2" style="fill: var(--color-surface); stroke: var(--color-line)" />
						<rect x="242" y="78" width="102" height="18" rx="7" style="fill: var(--color-accent-ink)" />
						<text x="252" y="91" font-size="12" font-weight="600" font-family="system-ui, sans-serif" style="fill: var(--color-surface)">sessions</text>
						<text x="252" y="110" font-size="10" font-family="system-ui, sans-serif" style="fill: var(--color-ink-soft)">id</text>
						<text x="336" y="110" font-size="8" font-weight="700" font-family="system-ui, sans-serif" text-anchor="end" style="fill: var(--color-warning)">PK</text>
						<text x="252" y="124" font-size="10" font-family="system-ui, sans-serif" style="fill: var(--color-ink-soft)">starts_at</text>
					</g>

					<!-- Relations -->
					<path class="fn-link fn-link--1" d="M 120 106 C 125 106 125 90 130 90" stroke-width="1.6" fill="none" stroke-linecap="round" style="stroke: var(--color-accent)" />
					<path class="fn-link fn-link--2" d="M 232 90 C 237 90 237 110 242 110" stroke-width="1.6" fill="none" stroke-linecap="round" style="stroke: var(--color-hot)" />

					<!-- "Schema ready ✓" -->
					<g class="fn-schema-ready">
						<text x="180" y="162" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, sans-serif" style="fill: var(--color-success)">Schema ready ✓</text>
					</g>
				</g>
			</svg>
		</div>
		<h2 id="feature-notification-title" class="feature-notification__title">Design schemas with AI</h2>
		<p class="feature-notification__description">
			Generate a new database from scratch or edit your existing one — just describe what you need.
		</p>
		<div class="feature-notification__actions">
			<UiButton @click="emit('dismiss')">Got it</UiButton>
		</div>
	</section>
</template>

<style scoped>
.feature-notification {
	position: fixed;
	bottom: var(--space-8);
	left: var(--space-8);
	z-index: var(--z-toast);
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
	width: clamp(200px, 25vw, 400px);
	padding: var(--space-4);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-panel);
	background: var(--color-surface-raised);
	box-shadow: var(--shadow-lift);
}

@media (max-width: 640px) {
	.feature-notification {
		left: var(--space-3);
		right: var(--space-3);
		bottom: var(--space-3);
		width: auto;
		max-width: 480px;
		margin: 0 auto;
	}
}

.feature-notification__animation {
	width: 100%;
	border-radius: var(--radius-control);
	overflow: hidden;
	color: var(--color-accent);
}

.fn-svg {
	display: block;
	width: 100%;
	height: auto;
}

.feature-notification__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-md);
	font-weight: var(--weight-semibold);
	line-height: var(--leading-tight);
	color: var(--color-ink);
}

.feature-notification__description {
	margin: 0;
	color: var(--color-muted);
}

.feature-notification__actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--space-2);
}

/* ──────────────────────────────────────────── */
/* Three-act animation                          */
/* Cycle: 7s                                    */
/*   Act 1 (0–1.5s   /  0–21%):  empty + Add db */
/*   Act 2 (1.5–3.5s / 21–50%):  chat + typing  */
/*   Act 3 (3.5–5.5s / 50–79%):  AI + diagram   */
/*   Hold  (5.5–7s   / 79–100%): linger & loop  */
/* ──────────────────────────────────────────── */

.fn-placeholder,
.fn-add-button,
.fn-pointer-1,
.fn-click-ripple,
.fn-chat-title,
.fn-chat-divider,
.fn-input,
.fn-caret,
.fn-send-button,
.fn-typing-clip,
.fn-user-message,
.fn-ai-avatar,
.fn-table,
.fn-link,
.fn-schema-ready {
	opacity: 0;
}

/* === ACT 1 elements === */

.fn-placeholder,
.fn-act--1 > circle,
.fn-act--1 > path,
.fn-act--1 > text {
	animation: fn-fade-act1 10s ease-in-out infinite;
}

.fn-add-button {
	animation: fn-add-btn 10s ease-in-out infinite;
	transform-origin: 180px 93px;
}

.fn-pointer-1 {
	animation: fn-pointer-1 10s ease-in-out infinite;
}

.fn-click-ripple {
	animation: fn-click-ripple 10s ease-in-out infinite;
}

@keyframes fn-fade-act1 {
	0%   { opacity: 0; }
	3%   { opacity: 1; }
	19%  { opacity: 1; }
	22%  { opacity: 0; }
	100% { opacity: 0; }
}

@keyframes fn-add-btn {
	0%   { opacity: 0; transform: scale(0.95); }
	3%   { opacity: 1; transform: scale(1); }
	17%  { opacity: 1; transform: scale(1); }
	18%  { opacity: 1; transform: scale(0.93); }
	19%  { opacity: 1; transform: scale(1); }
	22%  { opacity: 0; transform: scale(1); }
	100% { opacity: 0; }
}

@keyframes fn-pointer-1 {
	0%, 3%   { opacity: 0; transform: translate(60px, 40px); }
	5%       { opacity: 1; transform: translate(60px, 40px); }
	14%      { opacity: 1; transform: translate(178px, 86px); }
	17%      { opacity: 1; transform: translate(178px, 86px) scale(0.85); }
	19%      { opacity: 1; transform: translate(178px, 86px) scale(1); }
	22%      { opacity: 0; transform: translate(178px, 86px); }
	100%     { opacity: 0; }
}

@keyframes fn-click-ripple {
	0%, 17%  { opacity: 0; r: 0; }
	18%      { opacity: 0.85; r: 6; }
	21%      { opacity: 0; r: 34; }
	100%     { opacity: 0; r: 0; }
}

/* === ACT 2 elements === */

.fn-chat-divider {
	animation: fn-chat-frame 10s ease-in-out infinite;
}

.fn-chat-title--initial {
	animation: fn-chat-title-initial 10s ease-in-out infinite;
}

.fn-chat-title--final {
	animation: fn-chat-title-final 10s ease-in-out infinite;
}

@keyframes fn-chat-title-initial {
	0%, 21%  { opacity: 0; }
	24%      { opacity: 1; }
	42%      { opacity: 1; }
	45%      { opacity: 0; }
	100%     { opacity: 0; }
}

@keyframes fn-chat-title-final {
	0%, 42%  { opacity: 0; }
	45%      { opacity: 1; }
	93%      { opacity: 1; }
	100%     { opacity: 0; }
}

.fn-input {
	animation: fn-input-in 10s ease-in-out infinite;
}

.fn-typing-clip {
	animation: fn-typing 10s linear infinite;
}

.fn-caret {
	animation: fn-caret-track 10s linear infinite;
}

.fn-send-button {
	animation: fn-send-button 10s ease-in-out infinite;
	transform-origin: 326px 151px;
}

.fn-user-message {
	animation: fn-user-message 10s ease-in-out infinite;
}

@keyframes fn-chat-frame {
	0%, 21%  { opacity: 0; }
	24%      { opacity: 1; }
	93%      { opacity: 1; }
	100%     { opacity: 0; }
}

@keyframes fn-input-in {
	0%, 21%  { opacity: 0; transform: translateY(8px); }
	24%      { opacity: 1; transform: translateY(0); }
	48%      { opacity: 1; transform: translateY(0); }
	50%      { opacity: 0; transform: translateY(0); }
	100%     { opacity: 0; }
}

@keyframes fn-typing {
	0%, 25%   { width: 0; }
	40%       { width: 270px; }
	48%       { width: 270px; }
	50%       { width: 0; }
	100%      { width: 0; }
}

@keyframes fn-caret-track {
	0%, 25%  { opacity: 0; transform: translateX(0); }
	27%      { opacity: 1; transform: translateX(0); }
	40%      { opacity: 1; transform: translateX(255px); }
	42%      { opacity: 0; transform: translateX(255px); }
	44%      { opacity: 1; transform: translateX(255px); }
	46%      { opacity: 0; transform: translateX(255px); }
	48%      { opacity: 1; transform: translateX(255px); }
	50%      { opacity: 0; transform: translateX(255px); }
	100%     { opacity: 0; }
}

@keyframes fn-send-button {
	0%, 40%  { opacity: 0; transform: scale(0.9); }
	43%      { opacity: 1; transform: scale(0.9); }
	44%      { opacity: 1; transform: scale(1.15); }
	46%      { opacity: 1; transform: scale(1); }
	47%      { opacity: 1; transform: scale(0.9); }
	48%      { opacity: 1; transform: scale(1); }
	50%      { opacity: 0; transform: scale(1); }
	100%     { opacity: 0; }
}

@keyframes fn-user-message {
	0%, 47%  { opacity: 0; transform: translateY(80px) scale(0.95); }
	50%      { opacity: 1; transform: translateY(0) scale(1); }
	93%      { opacity: 1; transform: translateY(0) scale(1); }
	100%     { opacity: 0; }
}

/* === ACT 3 elements === */

.fn-ai-avatar {
	animation: fn-ai-avatar 10s ease-in-out infinite;
	transform-origin: 22px 50px;
}

.fn-table--1 { animation: fn-table-1 10s ease-out infinite; transform-origin: 69px 107px; }
.fn-table--2 { animation: fn-table-2 10s ease-out infinite; transform-origin: 181px 91px; }
.fn-table--3 { animation: fn-table-3 10s ease-out infinite; transform-origin: 293px 109px; }

.fn-link {
	stroke-dasharray: 50;
	stroke-dashoffset: 50;
}

.fn-link--1 { animation: fn-link-1 10s ease-in-out infinite; }
.fn-link--2 { animation: fn-link-2 10s ease-in-out infinite; }

.fn-schema-ready { animation: fn-schema-ready 10s ease-in-out infinite; }

@keyframes fn-ai-avatar {
	0%, 53%  { opacity: 0; transform: scale(0.7); }
	56%      { opacity: 1; transform: scale(1.1); }
	58%      { opacity: 1; transform: scale(1); }
	93%      { opacity: 1; transform: scale(1); }
	100%     { opacity: 0; }
}

@keyframes fn-table-1 {
	0%, 56%  { opacity: 0; transform: translateY(8px) scale(0.92); }
	60%      { opacity: 1; transform: translateY(0) scale(1); }
	93%      { opacity: 1; transform: translateY(0) scale(1); }
	100%     { opacity: 0; }
}

@keyframes fn-table-2 {
	0%, 60%  { opacity: 0; transform: translateY(8px) scale(0.92); }
	64%      { opacity: 1; transform: translateY(0) scale(1); }
	93%      { opacity: 1; transform: translateY(0) scale(1); }
	100%     { opacity: 0; }
}

@keyframes fn-table-3 {
	0%, 64%  { opacity: 0; transform: translateY(8px) scale(0.92); }
	68%      { opacity: 1; transform: translateY(0) scale(1); }
	93%      { opacity: 1; transform: translateY(0) scale(1); }
	100%     { opacity: 0; }
}

@keyframes fn-link-1 {
	0%, 68%   { stroke-dashoffset: 50; opacity: 0; }
	70%       { opacity: 1; }
	74%       { stroke-dashoffset: 0; opacity: 1; }
	93%       { stroke-dashoffset: 0; opacity: 1; }
	100%      { stroke-dashoffset: 50; opacity: 0; }
}

@keyframes fn-link-2 {
	0%, 72%   { stroke-dashoffset: 50; opacity: 0; }
	74%       { opacity: 1; }
	78%       { stroke-dashoffset: 0; opacity: 1; }
	93%       { stroke-dashoffset: 0; opacity: 1; }
	100%      { stroke-dashoffset: 50; opacity: 0; }
}

@keyframes fn-schema-ready {
	0%, 76%  { opacity: 0; transform: translateY(4px); }
	80%      { opacity: 1; transform: translateY(0); }
	93%      { opacity: 1; transform: translateY(0); }
	100%     { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
	.fn-placeholder,
	.fn-add-button,
	.fn-pointer-1,
	.fn-click-ripple,
	.fn-chat-title--final,
	.fn-chat-divider,
	.fn-input,
	.fn-caret,
	.fn-send-button,
	.fn-user-message,
	.fn-ai-avatar,
	.fn-table,
	.fn-link,
	.fn-schema-ready {
		animation: none !important;
		opacity: 1 !important;
		transform: none !important;
		stroke-dashoffset: 0 !important;
	}
	.fn-typing-clip {
		animation: none !important;
		width: 270px !important;
	}
	.fn-chat-title--initial { display: none !important; }
	.fn-act--1 { display: none !important; }
}
</style>
