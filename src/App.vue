<template>
  <router-view v-slot="{ Component }">
    <component :is="Component" />
  </router-view>
</template>

<script setup lang="ts">
import { initializeAudio } from './utils/common'
import { setAppBackgroundStatusSafely } from '@/utils/imLogin'

initializeAudio()

document.addEventListener('contextmenu', function (event) {
  event.preventDefault()
})

document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') {
    void setAppBackgroundStatusSafely(false)
  }
  if (document.visibilityState === 'hidden') {
    void setAppBackgroundStatusSafely(true)
  }
})
</script>

<style lang="scss"></style>
