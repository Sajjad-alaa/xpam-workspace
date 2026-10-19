<script setup lang="ts">
import { useUserInfoStore } from "~/store/modules/userInfo";

definePageMeta({
  layout: "default",
  keepalive: true
});

const { loggedIn } = storeToRefs(useUserInfoStore());
</script>

<template>
  <AccessCenter v-if="loggedIn" class="h-full min-h-0" />
</template>
