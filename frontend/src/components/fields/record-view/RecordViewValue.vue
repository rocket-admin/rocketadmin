<script setup lang="ts">
/**
 * The shared value text of every record-view widget — the `.field-view-value` rule in Angular's
 * `base-record-view-field.component.css`, which every widget pulled in through `styleUrls`. One
 * wrapper instead of 30 copies of the same CSS: muted ink, wraps anywhere, never wider than the panel.
 *
 * Attributes (`class`, `title`, `href`, `style`, listeners) fall through to the rendered element.
 */
withDefaults(
	defineProps<{
		/** Element to render: a `span` for plain text, an `a` for the phone link, … */
		tag?: 'span' | 'div' | 'a';
	}>(),
	{ tag: 'span' },
);
</script>

<template>
	<component :is="tag" class="record-view-value"><slot /></component>
</template>

<style scoped>
.record-view-value {
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: keep-all;
  white-space: break-spaces;
  color: var(--color-ink-soft);
}
</style>
