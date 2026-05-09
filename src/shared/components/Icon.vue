<script lang="ts">
export const ICON_NAMES = [
  'plus', 'arrow-right', 'arrow-left',
  'chevron-right', 'chevron-left', 'chevron-down',
  'close', 'check', 'search',
  'users', 'wallet', 'scale',
  'settings', 'home', 'swap',
  'card', 'copy', 'edit', 'trash',
  'dot', 'eye', 'download', 'sparkle',
  'wifi', 'phone', 'moon', 'sun',
  'lock', 'mail', 'shield',
  'user-plus', 'message', 'refresh',
] as const
export type IconName = typeof ICON_NAMES[number]
</script>

<script setup lang="ts">
withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 18 })
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'plus'"><path d="M12 5v14M5 12h14" /></template>
    <template v-else-if="name === 'arrow-right'"><path d="M5 12h14M13 6l6 6-6 6" /></template>
    <template v-else-if="name === 'arrow-left'"><path d="M19 12H5M11 18l-6-6 6-6" /></template>
    <template v-else-if="name === 'chevron-right'"><path d="M9 6l6 6-6 6" /></template>
    <template v-else-if="name === 'chevron-left'"><path d="M15 6l-6 6 6 6" /></template>
    <template v-else-if="name === 'chevron-down'"><path d="M6 9l6 6 6-6" /></template>
    <template v-else-if="name === 'close'"><path d="M6 6l12 12M18 6l-12 12" /></template>
    <template v-else-if="name === 'check'"><path d="M5 12.5l4.5 4.5L19 7.5" /></template>
    <template v-else-if="name === 'search'"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></template>
    <template v-else-if="name === 'users'"><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M16 10.5a3 3 0 1 0 0-6M21 20c0-2.4-1.6-4.4-4-4.9" /></template>
    <template v-else-if="name === 'wallet'"><path d="M4 7c0-1.7 1.3-3 3-3h10a3 3 0 0 1 3 3M4 7v10a3 3 0 0 0 3 3h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H4" /><circle cx="17" cy="13" r="1.25" /></template>
    <template v-else-if="name === 'scale'"><path d="M12 4v16M6 20h12M5 10l2.5-5L10 10M14 10l2.5-5L19 10" /><path d="M4 10h7M13 10h7M4 10c0 2 1.3 3.5 3.5 3.5S11 12 11 10M13 10c0 2 1.3 3.5 3.5 3.5S20 12 20 10" /></template>
    <template v-else-if="name === 'settings'"><circle cx="12" cy="12" r="3" /><path d="M19.4 14.6a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V20a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H4a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H10a1.6 1.6 0 0 0 1-1.5V4a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V10a1.6 1.6 0 0 0 1.5 1H20a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></template>
    <template v-else-if="name === 'home'"><path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2h-4v-6h-4v6H6a2 2 0 0 1-2-2z" /></template>
    <template v-else-if="name === 'swap'"><path d="M7 7h13M17 4l3 3-3 3M17 17H4M7 14l-3 3 3 3" /></template>
    <template v-else-if="name === 'card'"><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></template>
    <template v-else-if="name === 'copy'"><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></template>
    <template v-else-if="name === 'edit'"><path d="M4 20h4l10-10-4-4L4 16zM14 6l4 4" /></template>
    <template v-else-if="name === 'trash'"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></template>
    <template v-else-if="name === 'dot'"><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></template>
    <template v-else-if="name === 'eye'"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></template>
    <template v-else-if="name === 'download'"><path d="M12 4v12M7 11l5 5 5-5M4 20h16" /></template>
    <template v-else-if="name === 'sparkle'"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" /></template>
    <template v-else-if="name === 'wifi'"><path d="M3 9a14 14 0 0 1 18 0M6 13a9 9 0 0 1 12 0M9 17a4 4 0 0 1 6 0" /><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" /></template>
    <template v-else-if="name === 'phone'"><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M10 18h4" /></template>
    <template v-else-if="name === 'moon'"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></template>
    <template v-else-if="name === 'sun'"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></template>
    <template v-else-if="name === 'lock'"><rect x="4.5" y="10" width="15" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></template>
    <template v-else-if="name === 'mail'"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 7l9 7 9-7" /></template>
    <template v-else-if="name === 'shield'"><path d="M12 3l8 3v6c0 4.5-3.3 8.5-8 9-4.7-.5-8-4.5-8-9V6z" /><path d="M9 12.5l2 2 4-4" /></template>
    <template v-else-if="name === 'user-plus'"><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M18 9v6M15 12h6" /></template>
    <template v-else-if="name === 'message'"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-4 4v-4H6a2 2 0 0 1-2-2z" /></template>
    <template v-else-if="name === 'refresh'"><path d="M4 12a8 8 0 0 1 13.7-5.7L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.7L4 15M4 20v-5h5" /></template>
  </svg>
</template>
