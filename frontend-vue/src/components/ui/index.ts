/**
 * The design system's public surface. Views import from here — `import { UiButton } from
 * '@/components/ui'` — so a primitive can be split or renamed without touching every call site.
 *
 * See `CONVENTIONS.md` in this directory (rendered in Storybook under _Foundations → Conventions_)
 * before adding one.
 */

export { FIELD_CONTEXT, type FieldContext } from './fieldContext';
export { MENU_CONTEXT, type MenuContext } from './menuContext';
export { TABS_CONTEXT, type TabsContext } from './tabsContext';
export { default as UiAlert } from './UiAlert.vue';
export { default as UiBadge } from './UiBadge.vue';
export { default as UiButton } from './UiButton.vue';
export { default as UiCard } from './UiCard.vue';
export { default as UiChip } from './UiChip.vue';
export { default as UiConfirmDialog } from './UiConfirmDialog.vue';
export { default as UiDrawer } from './UiDrawer.vue';
export { default as UiField } from './UiField.vue';
export { default as UiIcon } from './UiIcon.vue';
export { default as UiIconButton } from './UiIconButton.vue';
export { default as UiInput } from './UiInput.vue';
export { default as UiMenu } from './UiMenu.vue';
export { default as UiMenuItem } from './UiMenuItem.vue';
export { default as UiModal } from './UiModal.vue';
export { default as UiPageShell } from './UiPageShell.vue';
export { default as UiProgressBar } from './UiProgressBar.vue';
export { default as UiSkeleton } from './UiSkeleton.vue';
export { default as UiSpinner } from './UiSpinner.vue';
export { default as UiTab } from './UiTab.vue';
export { default as UiTabPanel } from './UiTabPanel.vue';
export { default as UiTabs } from './UiTabs.vue';
