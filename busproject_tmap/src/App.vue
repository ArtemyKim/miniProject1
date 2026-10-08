<script setup>
import MapView from './components/MapView.vue'
import TransitSearch from './components/TransitSearch.vue'
</script>

<template>
  <div class="app-page">
    <MapView />
    <TransitSearch />
  </div>
</template>

<style scoped>
.app-page {
  position: relative;
  width: 100%;
  height: 100dvh;
}
</style>