<template>
  <aside class="transit-panel">
    <h2>대중교통 경로 검색</h2>

    <form @submit.prevent="searchRoutes">
      <PlaceSearch
        label="출발지"
        input-id="start-place"
        placeholder="예: 노원역 7호선"
        :disabled="loading"
        @select="setStartPlace"
      />

      <PlaceSearch
        label="도착지"
        input-id="end-place"
        placeholder="예: 서울 구로구청"
        :disabled="loading"
        @select="setEndPlace"
      />

      <button
        type="submit"
        :disabled="loading || !startPlace || !endPlace"
      >
        {{ loading ? '조회 중...' : '대중교통 경로 검색' }}
      </button>
    </form>

    <p v-if="errorMessage" class="error">
      {{ errorMessage }}
    </p>

    <p v-if="searched && !loading && !errorMessage && !routes.length">
      조회된 경로가 없습니다.
    </p>

    <article
      v-for="(route, index) in routes"
      :key="index"
      class="route-card"
    >
      <h3>경로 {{ index + 1 }}</h3>

      <p>
        약 {{ minutes(route.totalTime) }}분 ·
        환승 {{ route.transferCount ?? 0 }}회
      </p>

      <p v-if="route.fare?.regular?.totalFare != null">
        요금 {{ route.fare.regular.totalFare.toLocaleString() }}원
      </p>

      <ol>
        <li
          v-for="(leg, legIndex) in route.legs ?? []"
          :key="legIndex"
        >
          <strong>
            {{ modeName(leg.mode) }}
            {{ leg.route ? ` / ${leg.route}` : '' }}
          </strong>

          <div>
            {{ leg.start?.name }} → {{ leg.end?.name }}
          </div>

          <small>
            약 {{ minutes(leg.sectionTime) }}분 ·
            {{ leg.distance }}m
          </small>
        </li>
      </ol>
    </article>
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import PlaceSearch from './PlaceSearch.vue'

const startX = ref('')
const startY = ref('')
const endX = ref('')
const endY = ref('')

const startPlace = ref(null)
const endPlace = ref(null)

function setStartPlace(place) {
  startPlace.value = place
  startX.value = place?.lon ?? ''
  startY.value = place?.lat ?? ''

  routes.value = []
  searched.value = false
  errorMessage.value = ''
}

function setEndPlace(place) {
  endPlace.value = place
  endX.value = place?.lon ?? ''
  endY.value = place?.lat ?? ''

  routes.value = []
  searched.value = false
  errorMessage.value = ''
}

const routes = ref([])
const loading = ref(false)
const searched = ref(false)
const errorMessage = ref('')

// 같은 좌표를 다시 검색하면 기존 응답 사용
// 페이지를 새로고침하면 캐시는 초기화됩니다.
const cache = new Map()

const minutes = (seconds) =>
  Math.ceil(Number(seconds ?? 0) / 60)

const modeName = (mode) => ({
  WALK: '도보',
  BUS: '버스',
  SUBWAY: '지하철',
  EXPRESSBUS: '고속·시외버스',
  TRAIN: '기차',
  AIRPLANE: '항공',
  FERRY: '해운',
}[mode] ?? mode)

async function searchRoutes() {
  if (loading.value) return

  errorMessage.value = ''

  if (!startPlace.value || !endPlace.value) {
    errorMessage.value = '출발지와 도착지를 검색하고 선택해 주세요.'
    return
  }

  const values = [
    startX.value,
    startY.value,
    endX.value,
    endY.value,
  ]


  const numbers = values.map(Number)

  if (
    values.some((value) => String(value).trim() === '') ||
    numbers.some((value) => !Number.isFinite(value)) ||
    Math.abs(numbers[0]) > 180 ||
    Math.abs(numbers[2]) > 180 ||
    Math.abs(numbers[1]) > 90 ||
    Math.abs(numbers[3]) > 90
  ) {
    errorMessage.value = '올바른 경도와 위도를 입력해 주세요.'
    return
  }

  const body = {
    startX: String(numbers[0]),
    startY: String(numbers[1]),
    endX: String(numbers[2]),
    endY: String(numbers[3]),
    count: 10,
    lang: 0,
    format: 'json',
  }

  const cacheKey = JSON.stringify(body)

  searched.value = true
  routes.value = []

  if (cache.has(cacheKey)) {
    routes.value = cache.get(cacheKey)
    return
  }

  loading.value = true

  try {
    const response = await fetch('/api/transit/routes', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()

    let data

    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(
        `JSON 응답을 받지 못했습니다. HTTP ${response.status}`,
      )
    }

    if (!response.ok || data.error) {
      console.error('TMAP 오류 응답:', data)

      throw new Error(
        data.error?.message ||
        data.message ||
        `경로 조회 실패: HTTP ${response.status}`,
      )
    }

    const itineraries = data.metaData?.plan?.itineraries

    if (!Array.isArray(itineraries)) {
      console.error('TMAP 응답 확인:', data)
      throw new Error('응답에 경로 목록이 없습니다. Console을 확인해 주세요.')
    }

    // 시간이 제일 덜 걸리는 순으로 정렬
    const sortedRoutes = [...itineraries].sort(
      (a, b) => a.totalTime - b.totalTime,
    )

    routes.value = sortedRoutes
    cache.set(cacheKey, sortedRoutes)

    console.log('TMAP 대중교통 응답:', data)
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.transit-panel {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1000;
  width: min(360px, calc(100% - 32px));
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 20px;
  border-radius: 12px;
  background: white;
  color: #222;
  box-shadow: 0 4px 20px rgb(0 0 0 / 20%);
}

h2 {
  margin: 0 0 16px;
  font-size: 20px;
}

fieldset {
  display: grid;
  gap: 10px;
  margin: 0 0 12px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

label {
  display: grid;
  gap: 4px;
  font-size: 14px;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  width: 100%;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  background: #365cff;
  color: white;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.route-card {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #ddd;
}

ol {
  padding-left: 24px;
}

li {
  margin-bottom: 14px;
}

small {
  color: #666;
}

.error {
  color: #c62828;
}
</style>