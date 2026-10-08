<template>
  <main class="map-page">
    <div id="tmap-map" class="map-container"></div>

    <p v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </p>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'

const errorMessage = ref('')
let map = null

onMounted(() => {
  const Tmapv3 = window.Tmapv3

  // 지도 SDK 로딩 확인
  if (!Tmapv3?.Map) {
    errorMessage.value =
      'T map Vector SDK를 불러오지 못했습니다. Network 탭을 확인해 주세요.'
    return
  }

  try {
    // 서울시청 부근을 중심으로 지도 생성
    map = new Tmapv3.Map('tmap-map', {
      center: new Tmapv3.LatLng(37.5665, 126.9780),
      width: '100%',
      height: '100%',
      zoom: 15,
    })
  } catch (error) {
    console.error('T map 지도 생성 실패:', error)

    errorMessage.value =
      '지도를 생성하지 못했습니다. Console 탭을 확인해 주세요.'
  }
})
</script>

<style scoped>
.map-page {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
}

.map-container {
  width: 100%;
  height: 100%;
}

.error-message {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  z-index: 1000;
  margin: 0;
  padding: 16px;
  border-radius: 8px;
  background: #ffffff;
  color: #c62828;
  box-shadow: 0 2px 12px rgb(0 0 0 / 15%);
}
</style>