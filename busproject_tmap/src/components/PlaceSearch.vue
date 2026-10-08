<template>
  <section class="place-search">
    <label :for="inputId">{{ label }}</label>

    <div class="search-row">
      <input
        :id="inputId"
        v-model="keyword"
        :placeholder="placeholder"
        :disabled="loading || disabled"
        @input="clearSelection"
        @keydown.enter.stop.prevent="searchPlaces"
      />

      <button
        type="button"
        :disabled="loading || disabled || !keyword.trim()"
        @click="searchPlaces"
      >
        {{ loading ? '조회 중' : '장소 검색' }}
      </button>
    </div>

    <p v-if="selected" class="selected">
      선택: {{ selected.name }}
    </p>

    <p v-if="errorMessage" class="error">
      {{ errorMessage }}
    </p>

    <ul v-if="places.length">
      <li v-for="(place, index) in places" :key="index">
        <button
          type="button"
          class="place-result"
          :disabled="disabled"
          @click="selectPlace(place)"
        >
          <strong>{{ place.name }}</strong>
          <small>{{ place.address }}</small>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  label: String,
  inputId: String,
  placeholder: String,
  disabled: Boolean,
})

const emit = defineEmits(['select'])

const keyword = ref('')
const places = ref([])
const selected = ref(null)
const loading = ref(false)
const errorMessage = ref('')

function clearSelection() {
  selected.value = null
  places.value = []
  errorMessage.value = ''
  emit('select', null)
}

// 입구 좌표가 유효하면 사용하고, 없으면 중심 좌표 사용
function getCoordinates(poi) {
  for (const [lon, lat] of [
    [poi.frontLon, poi.frontLat],
    [poi.noorLon, poi.noorLat],
  ]) {
    if (lon == null || lat == null || lon === '' || lat === '') continue

    const x = Number(lon)
    const y = Number(lat)

    if (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      Math.abs(x) <= 180 &&
      Math.abs(y) <= 90 &&
      x !== 0 &&
      y !== 0
    ) {
      return { lon: String(x), lat: String(y) }
    }
  }

  return null
}

async function searchPlaces() {
  const query = keyword.value.trim()

  if (!query || loading.value || props.disabled) return

  clearSelection()
  loading.value = true

  try {
    const params = new URLSearchParams({
      version: '1',
      searchKeyword: query,
      searchType: 'all',
      page: '1',
      count: '10',
      resCoordType: 'WGS84GEO',
    })

    const response = await fetch(`/api/tmap/pois?${params}`, {
      headers: {
        Accept: 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      console.error('장소 검색 오류:', data)

      throw new Error(
        data.error?.message ||
        data.message ||
        `장소 검색 실패: HTTP ${response.status}`,
      )
    }

    const raw = data.searchPoiInfo?.pois?.poi
    const list = Array.isArray(raw) ? raw : raw ? [raw] : []

    places.value = list.flatMap((poi) => {
      const coordinates = getCoordinates(poi)

      if (!coordinates) return []

      return [{
        id: poi.id,
        name: poi.name,
        address: [
          poi.upperAddrName,
          poi.middleAddrName,
          poi.lowerAddrName,
          poi.roadName,
          poi.firstBuildNo,
        ].filter(Boolean).join(' '),
        ...coordinates,
      }]
    })

    if (!places.value.length) {
      errorMessage.value = '검색 결과가 없습니다. 지역명을 함께 입력해 보세요.'
    }
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

function selectPlace(place) {
  selected.value = place
  keyword.value = place.name
  places.value = []
  emit('select', place)
}
</script>

<style scoped>
.place-search {
  margin-bottom: 16px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
}

.search-row {
  display: flex;
  gap: 6px;
}

input {
  flex: 1;
  min-width: 0;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

button {
  padding: 10px;
  border: 0;
  border-radius: 6px;
  background: #365cff;
  color: white;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: default;
}

ul {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.place-result {
  display: block;
  width: 100%;
  margin-top: 6px;
  text-align: left;
  background: #f2f4f8;
  color: #222;
}

small {
  display: block;
  margin-top: 4px;
  color: #666;
}

.selected {
  color: #24713c;
  font-size: 13px;
}

.error {
  color: #c62828;
  font-size: 13px;
}
</style>