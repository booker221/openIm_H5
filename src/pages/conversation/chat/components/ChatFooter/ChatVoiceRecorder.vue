<template>
  <div
    class="voice_recorder"
    :class="{
      voice_recorder_recording: isRecording,
      voice_recorder_cancel: willCancel,
    }"
    @pointerdown.prevent="startRecording"
    @pointermove.prevent="handlePointerMove"
    @pointerup.prevent="finishRecording"
    @pointercancel.prevent="cancelRecording"
    @contextmenu.prevent
  >
    {{ buttonText }}
  </div>
  <div v-if="isRecording" class="voice_overlay">
    <div class="voice_overlay__card" :class="{ voice_overlay__card_cancel: willCancel }">
      <van-icon class="voice_overlay__icon" :name="willCancel ? 'delete-o' : 'music-o'" />
      <div v-if="!willCancel" class="voice_overlay__meter">
        <span
          v-for="item in meterBars"
          :key="item"
          :style="{ height: `${getBarHeight(item)}px` }"
        />
      </div>
      <div class="voice_overlay__time">
        {{ displaySeconds }}″
      </div>
      <div class="voice_overlay__tip">
        {{ overlayTip }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Recorder from 'js-audio-recorder'
import { getMediaCaptureErrorType, isInAppWebView } from '@/utils/mediaCapture'

type ChatVoiceRecorderEmits = {
  (event: 'send', file: File, duration: number): void
  (event: 'error', message: string): void
  (event: 'recordingChange', recording: boolean): void
}

const emit = defineEmits<ChatVoiceRecorderEmits>()
const { t } = useI18n()

const MAX_RECORD_SECONDS = 60
const MIN_RECORD_MS = 1000
const CANCEL_DISTANCE = 80
const meterBars = [1, 2, 3, 4, 5]

const isRecording = ref(false)
const willCancel = ref(false)
const duration = ref(0)
const countdown = ref(0)
const amplitude = ref(0)

let recorder: Recorder | undefined
let startTimestamp = 0
let startClientY = 0
let activePointerID: number | undefined
let durationTimer: number | undefined

const isMediaSupported = () =>
  Boolean(navigator.mediaDevices?.getUserMedia) &&
  (window.isSecureContext ||
    ['localhost', '127.0.0.1'].includes(window.location.hostname))

const buttonText = computed(() => {
  if (willCancel.value) {
    return '松开即可取消'
  }
  return isRecording.value ? '松开 结束' : '按住 说话'
})

const displaySeconds = computed(() =>
  Math.max(0, Math.min(MAX_RECORD_SECONDS, duration.value))
    .toString()
    .padStart(2, '0'),
)

const overlayTip = computed(() => {
  if (willCancel.value) {
    return '松开手指，取消发送'
  }
  if (countdown.value > 0) {
    return `还可以说 ${countdown.value} 秒`
  }
  return '松开结束，上滑取消'
})

const getElapsedMs = () =>
  startTimestamp ? Math.max(0, Date.now() - startTimestamp) : 0

const normalizeVolume = (value: number) => {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(1, value / 100))
}

const getBarHeight = (item: number) => {
  const base = 12 + item * 3
  const level = amplitude.value * (10 + item * 5)
  return Math.round(base + level)
}

const clearDurationTimer = () => {
  if (!durationTimer) {
    return
  }
  window.clearInterval(durationTimer)
  durationTimer = undefined
}

const resetState = () => {
  clearDurationTimer()
  isRecording.value = false
  willCancel.value = false
  duration.value = 0
  countdown.value = 0
  amplitude.value = 0
  startTimestamp = 0
  startClientY = 0
  activePointerID = undefined
  emit('recordingChange', false)
}

const updateDuration = async () => {
  const seconds = Math.floor(getElapsedMs() / 1000)
  duration.value = Math.min(seconds, MAX_RECORD_SECONDS)
  const remain = MAX_RECORD_SECONDS - duration.value
  countdown.value = remain <= 10 ? remain : 0
  if (seconds >= MAX_RECORD_SECONDS) {
    await stopRecording(false)
  }
}

const startDurationTimer = () => {
  clearDurationTimer()
  durationTimer = window.setInterval(() => {
    updateDuration()
  }, 250)
}

const destroyRecorder = async (target?: Recorder) => {
  try {
    await target?.destroy()
  } catch (error) {
    console.warn(error)
  }
}

const getRecordingErrorMessage = (error: unknown) => {
  const errorType = getMediaCaptureErrorType(error)

  if (errorType === 'permission_denied') {
    return t(
      isInAppWebView()
        ? 'messageTip.microphonePermissionDeniedInApp'
        : 'messageTip.microphonePermissionDenied',
    )
  }

  if (errorType === 'device_in_use') {
    return t('messageTip.microphoneInUse')
  }

  if (errorType === 'device_not_found') {
    return t('messageTip.microphoneNotFound')
  }

  return t('messageTip.environmentNotSupported')
}

const startRecording = async (event: PointerEvent) => {
  if (isRecording.value) {
    return
  }
  if (!isMediaSupported()) {
    emit('error', t('messageTip.environmentNotSupported'))
    return
  }

  activePointerID = event.pointerId
  startClientY = event.clientY
  willCancel.value = false
  duration.value = 0
  countdown.value = 0
  amplitude.value = 0
  isRecording.value = true
  emit('recordingChange', true)

  const target = event.currentTarget as HTMLElement | null
  target?.setPointerCapture?.(event.pointerId)

  recorder = new Recorder({
    sampleBits: 16,
    sampleRate: 48000,
    numChannels: 1,
  })
  recorder.onprogress = ({ vol }) => {
    amplitude.value = normalizeVolume(vol)
  }

  try {
    await recorder.start()
    startTimestamp = Date.now()
    startDurationTimer()
  } catch (error) {
    await destroyRecorder(recorder)
    recorder = undefined
    resetState()
    emit('error', getRecordingErrorMessage(error))
  }
}

const handlePointerMove = (event: PointerEvent) => {
  if (!isRecording.value || event.pointerId !== activePointerID) {
    return
  }
  willCancel.value = startClientY - event.clientY > CANCEL_DISTANCE
}

const finishRecording = () => {
  stopRecording(willCancel.value)
}

const cancelRecording = () => {
  stopRecording(true)
}

const stopRecording = async (cancel: boolean) => {
  const currentRecorder = recorder
  if (!currentRecorder || !isRecording.value) {
    resetState()
    return
  }

  recorder = undefined
  const elapsedMs = getElapsedMs()
  resetState()

  try {
    currentRecorder.stop()
  } catch (error) {
    console.warn(error)
  }

  if (cancel) {
    await destroyRecorder(currentRecorder)
    return
  }

  if (elapsedMs < MIN_RECORD_MS) {
    await destroyRecorder(currentRecorder)
    emit('error', t('messageTip.recordingTooShort'))
    return
  }

  const blob = currentRecorder.getWAVBlob()
  const durationSeconds = Math.min(
    MAX_RECORD_SECONDS,
    Math.max(1, Math.round(elapsedMs / 1000)),
  )
  const file = new File([blob], `voice-${Date.now()}.wav`, {
    type: 'audio/wav',
  })
  emit('send', file, durationSeconds)
  await destroyRecorder(currentRecorder)
}

onBeforeUnmount(() => {
  stopRecording(true)
})
</script>

<style lang="scss" scoped>
.voice_recorder {
  height: 32px;
  border-radius: 4px;
  background: #fff;
  color: #0c1c33;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  border: 1px solid transparent;
}

.voice_recorder_recording {
  background: #0089ff;
  color: #fff;
}

.voice_recorder_cancel {
  background: #d93a49;
  color: #fff;
}

.voice_overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.18);
}

.voice_overlay__card {
  width: min(280px, 78vw);
  min-height: 168px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.86);
  color: #fff;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.voice_overlay__card_cancel {
  background: #d93a49;
}

.voice_overlay__icon {
  font-size: 42px;
}

.voice_overlay__meter {
  height: 48px;
  margin-top: 12px;
  display: flex;
  align-items: flex-end;
  gap: 4px;

  span {
    width: 6px;
    min-height: 12px;
    border-radius: 999px;
    background: #4cd964;
    transition: height 0.12s;
  }
}

.voice_overlay__time {
  margin-top: 12px;
  font-size: 14px;
  font-weight: 600;
}

.voice_overlay__tip {
  margin-top: 10px;
  font-size: 14px;
  text-align: center;
}
</style>
