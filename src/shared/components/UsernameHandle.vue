<script setup lang="ts">
defineProps<{ username: string }>()
</script>

<template>
  <bdi class="username-handle">@{{ username }}</bdi>
</template>

<style scoped>
.username-handle {
  /* <bdi> already implies unicode-bidi: isolate via the user-agent stylesheet,
     plus dir="auto" by default (first-strong direction detection). Repeating
     unicode-bidi: isolate is defensive in case anything overrides it. */
  unicode-bidi: isolate;
}
</style>
