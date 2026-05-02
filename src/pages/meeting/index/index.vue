<template>
  <div class="page_container meeting-page">
    <div class="meeting-header">
      <div class="meeting-title">{{ $t('voiceLiveRoom') }}</div>
    </div>

    <div class="meeting-body">
      <div v-if="initialLoading && rooms.length === 0" class="meeting-loading">
        <van-loading size="24px" vertical>{{ $t('loading') }}</van-loading>
      </div>

      <template v-else>
        <van-pull-refresh v-model="refreshing" class="meeting-refresh" @refresh="handleRefresh">
          <div v-if="showDisabledState" class="meeting-empty">
            <div class="meeting-empty-icon">
              <van-icon name="video-o" size="72" color="#b6c6df" />
            </div>
            <div class="meeting-empty-title">{{ $t('meetingFeatureDisabled') }}</div>
          </div>

          <div v-else-if="rooms.length === 0" class="meeting-empty">
            <div class="meeting-empty-icon">
              <img :src="meetingEmptyIcon" alt="meeting-empty" />
            </div>
            <div class="meeting-empty-title">{{ $t('noLiveRoom') }}</div>
            <div class="meeting-empty-desc">{{ $t('retryLiveRoomTip') }}</div>
          </div>

          <div v-else class="meeting-list">
            <button
              v-for="room in rooms"
              :key="room.meetingID"
              class="meeting-card"
              type="button"
              @click="handleRoomClick(room)"
            >
              <div class="meeting-cover">
                <img
                  v-if="room.coverURL"
                  :src="room.coverURL"
                  :alt="room.subject"
                  class="meeting-cover-image"
                />
                <div v-else class="meeting-cover-fallback">
                  <van-icon name="video-o" size="34" :color="room.status === 2 ? '#18e875' : '#0089ff'" />
                </div>
              </div>

              <div class="meeting-card-content">
                <div class="meeting-card-title">{{ room.subject }}</div>
                <div v-if="room.description" class="meeting-card-desc">
                  {{ room.description }}
                </div>

                <div class="meeting-card-footer">
                  <div class="meeting-card-time">
                    <van-icon name="clock-o" size="14" color="#a3a7af" />
                    <span>{{ formatMeetingTime(room.scheduledTime) }}</span>
                  </div>
                  <div class="meeting-card-status">{{ getMeetingStatusText(room.status) }}</div>
                </div>
              </div>
            </button>

            <button
              v-if="hasMore"
              class="meeting-load-more"
              type="button"
              :disabled="loadingMore"
              @click="handleLoadMore"
            >
              <van-loading v-if="loadingMore" size="16" />
              <span>{{ loadingMore ? $t('loading') : $t('seeMore') }}</span>
            </button>
          </div>
        </van-pull-refresh>
      </template>
    </div>

    <van-popup v-model:show="passwordPopupVisible" round class="meeting-password-popup">
      <div class="meeting-password-title">{{ $t('meetingRoomPassword') }}</div>
      <div class="meeting-password-input">
        <van-field
          v-model="passwordInput"
          type="password"
          :placeholder="$t('meetingRoomPasswordHint')"
          @keypress.enter="submitPassword"
        />
      </div>
      <div class="meeting-password-actions">
        <button type="button" @click="closePasswordDialog">{{ $t('buttons.cancel') }}</button>
        <button type="button" class="primary" @click="submitPassword">
          {{ $t('buttons.confirm') }}
        </button>
      </div>
    </van-popup>
  </div>
</template>

<script name="meeting" setup lang="ts">
import dayjs from 'dayjs'
import { showToast } from 'vant'
import meetingEmptyIcon from '@assets/images/conversation/metting.png'
import { getMeetingsPublic, type MeetingInfo } from '@/api/meeting'
import useAppConfigStore from '@/store/modules/appConfig'
import { feedbackToast } from '@/utils/common'

const { t } = useI18n()
const appConfigStore = useAppConfigStore()

const PAGE_SIZE = 100
const POLLING_INTERVAL = 30 * 1000

const rooms = ref<MeetingInfo[]>([])
const initialLoading = ref(true)
const refreshing = ref(false)
const loadingMore = ref(false)
const hasMore = ref(false)
const currentPage = ref(1)
const initialized = ref(false)
const requestInFlight = ref(false)
const passwordPopupVisible = ref(false)
const passwordInput = ref('')
const pendingRoom = ref<MeetingInfo | null>(null)
const lastLoadedAt = ref(0)

let pollingTimer: number | undefined

const showDisabledState = computed(
  () => appConfigStore.storeLoaded && appConfigStore.storeAppConfig?.meeting === false,
)

const normalizeRooms = (meetingList: MeetingInfo[]) =>
  meetingList.filter((room) => room.status === 2 && room.groupID?.trim())

const formatMeetingTime = (time: number) => {
  if (!time) return ''
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

const getMeetingStatusText = (status: number) => {
  if (status === 2) return '进行中'
  if (status === 1) return '已预约'
  return '未知'
}

const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const buildMeetingUrl = (room: MeetingInfo) => {
  const groupID = room.groupID?.trim() ?? ''
  const encodedTitle = encodeURIComponent(room.subject ?? '')
  const encodedCoverURL = encodeURIComponent(room.coverURL ?? '')
  const encodedPassword = encodeBase64Url(room.password ?? '')
  const baseUrl = `https://mh5.imall.cloud/${groupID}?room=${encodedTitle}&coverURL=${encodedCoverURL}&p=${encodedPassword}`

  const extraParams = []
  const messageWs = appConfigStore.storeAppConfig?.['message.ws']
  const liveApi = appConfigStore.storeAppConfig?.['live.api']

  if (messageWs) {
    extraParams.push(`ws=${encodeURIComponent(messageWs)}`)
  }
  if (liveApi) {
    extraParams.push(`liveApi=${encodeURIComponent(liveApi)}`)
  }

  return extraParams.length ? `${baseUrl}&${extraParams.join('&')}` : baseUrl
}

const openMeetingRoom = (room: MeetingInfo) => {
  if (!room.groupID?.trim()) {
    showToast({
      type: 'fail',
      message: t('messageTip.meetingRoomNoGroup'),
    })
    return
  }

  const url = buildMeetingUrl(room)
  const nextWindow = window.open(url, '_blank', 'noopener,noreferrer')
  if (!nextWindow) {
    window.location.href = url
  }
}

const loadRooms = async ({
  refresh = false,
  silent = false,
}: {
  refresh?: boolean
  silent?: boolean
} = {}) => {
  if (requestInFlight.value) return

  requestInFlight.value = true
  if (refresh) {
    currentPage.value = 1
  }

  if (refresh && rooms.value.length === 0) {
    initialLoading.value = true
  }
  if (!refresh && rooms.value.length > 0) {
    loadingMore.value = true
  }

  try {
    const { data } = await getMeetingsPublic({
      status: 2,
      pageNumber: currentPage.value,
      showNumber: PAGE_SIZE,
    })

    const nextRooms = normalizeRooms(data?.meetings ?? [])

    if (refresh) {
      rooms.value = nextRooms
    } else {
      const merged = [...rooms.value]
      nextRooms.forEach((room) => {
        if (!merged.find((item) => item.meetingID === room.meetingID)) {
          merged.push(room)
        }
      })
      rooms.value = merged
    }

    hasMore.value = nextRooms.length >= PAGE_SIZE
    if (nextRooms.length > 0) {
      currentPage.value += 1
    }
    lastLoadedAt.value = Date.now()
  } catch (error) {
    if (!silent) {
      feedbackToast({
        message: t('messageTip.failLoad'),
        error,
      })
    }
  } finally {
    requestInFlight.value = false
    initialLoading.value = false
    refreshing.value = false
    loadingMore.value = false
  }
}

const handleRefresh = async () => {
  await loadRooms({ refresh: true })
}

const handleLoadMore = async () => {
  if (!hasMore.value || loadingMore.value) return
  await loadRooms()
}

const handleRoomClick = (room: MeetingInfo) => {
  const hasPassword = !!room.password?.trim()
  if (hasPassword) {
    pendingRoom.value = room
    passwordInput.value = ''
    passwordPopupVisible.value = true
    return
  }
  openMeetingRoom(room)
}

const closePasswordDialog = () => {
  passwordPopupVisible.value = false
  passwordInput.value = ''
  pendingRoom.value = null
}

const submitPassword = () => {
  if (!pendingRoom.value) return
  if (!passwordInput.value.trim()) {
    showToast({
      type: 'fail',
      message: t('messageTip.meetingPasswordEmpty'),
    })
    return
  }
  if (passwordInput.value.trim() !== `${pendingRoom.value.password ?? ''}`.trim()) {
    showToast({
      type: 'fail',
      message: t('messageTip.meetingPasswordError'),
    })
    return
  }

  const room = pendingRoom.value
  closePasswordDialog()
  openMeetingRoom(room)
}

const stopPolling = () => {
  if (pollingTimer) {
    window.clearInterval(pollingTimer)
    pollingTimer = undefined
  }
}

const startPolling = () => {
  stopPolling()
  pollingTimer = window.setInterval(() => {
    loadRooms({ refresh: true, silent: true })
  }, POLLING_INTERVAL)
}

const ensureReady = async () => {
  if (!initialized.value) {
    initialized.value = true
    await appConfigStore.fetchAppConfig(true)
    await loadRooms({ refresh: true, silent: true })
    startPolling()
    return
  }

  await appConfigStore.fetchAppConfig(true)
  if (Date.now() - lastLoadedAt.value > POLLING_INTERVAL) {
    await loadRooms({ refresh: true, silent: true })
  }
  startPolling()
}

onActivated(() => {
  ensureReady()
})

onDeactivated(() => {
  stopPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style lang="scss" scoped>
.meeting-page {
  background: #f8f9fa;
}

.meeting-header {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding-top: env(safe-area-inset-top);
  background: #fff;
  border-bottom: 1px solid #e8eaef;
}

.meeting-title {
  padding: 0 20px;
  font-size: 17px;
  font-weight: 600;
  line-height: 46px;
  color: #0c1c33;
}

.meeting-body {
  flex: 1;
  overflow: hidden;
}

.meeting-refresh {
  height: 100%;
  overflow-y: auto;
}

.meeting-loading,
.meeting-empty {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px 120px;
  text-align: center;
}

.meeting-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.meeting-empty-icon img {
  width: 80px;
  opacity: 0.5;
}

.meeting-empty-title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #8e9ab0;
}

.meeting-empty-desc {
  font-size: 12px;
  color: #b6c6df;
}

.meeting-list {
  padding: 6px 12px 16px;
}

.meeting-card {
  display: flex;
  width: 100%;
  margin-bottom: 10px;
  padding: 10px;
  border: 0;
  border-radius: 4px;
  background: #fff;
  text-align: left;
}

.meeting-cover {
  width: 120px;
  min-width: 120px;
  height: 66px;
  overflow: hidden;
  border-radius: 4px;
  background: #f8f9fa;
}

.meeting-cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meeting-cover-fallback {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 137, 255, 0.08), rgba(24, 232, 117, 0.08));
}

.meeting-card-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  padding-left: 8px;
}

.meeting-card-title {
  display: -webkit-box;
  overflow: hidden;
  color: #0c1c33;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.meeting-card-desc {
  margin-top: 4px;
  overflow: hidden;
  color: #a3a7af;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meeting-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
}

.meeting-card-time {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  color: #a3a7af;
  font-size: 11px;
}

.meeting-card-time span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meeting-card-status {
  min-width: 56px;
  padding: 4px 8px;
  border-radius: 4px;
  background: linear-gradient(135deg, #2b5ee6, #1de8de);
  color: #fff;
  font-size: 10px;
  font-weight: 500;
  text-align: center;
}

.meeting-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px 0;
  border: 0;
  background: transparent;
  color: #8e9ab0;
  font-size: 12px;
}

.meeting-password-popup {
  width: 280px;
  padding-top: 20px;
  overflow: hidden;
}

.meeting-password-title {
  margin-bottom: 12px;
  text-align: center;
  color: #0c1c33;
  font-size: 17px;
  font-weight: 500;
}

.meeting-password-input {
  padding: 0 20px 20px;
}

.meeting-password-input :deep(.van-cell) {
  padding: 10px 12px;
  border: 1px solid #e8eaef;
  border-radius: 4px;
  background: #fff !important;
}

.meeting-password-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid #e8eaef;
}

.meeting-password-actions button {
  height: 48px;
  border: 0;
  background: #fff;
  color: #0c1c33;
  font-size: 17px;
}

.meeting-password-actions button.primary {
  color: #0089ff;
  border-left: 1px solid #e8eaef;
}
</style>
