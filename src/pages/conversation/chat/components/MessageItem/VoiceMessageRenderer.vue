<template>
  <button
    class="voice_message"
    :class="{ voice_message_self: isSelfMsg, voice_message_playing: isPlaying }"
    :style="{ width: `${bubbleWidth}px` }"
    type="button"
    @click="togglePlay"
  >
    <template v-if="isSelfMsg">
      <span class="voice_message__duration">{{ durationLabel }}</span>
      <span class="voice_message__bar" />
      <van-icon class="voice_message__icon" :name="isPlaying ? 'pause-circle-o' : 'play-circle-o'" />
    </template>
    <template v-else>
      <van-icon class="voice_message__icon" :name="isPlaying ? 'pause-circle-o' : 'play-circle-o'" />
      <span class="voice_message__bar" />
      <span class="voice_message__duration">{{ durationLabel }}</span>
    </template>
  </button>
</template>

<script setup lang="ts">
import { feedbackToast } from '@/utils/common'
import { ExedMessageItem } from './data'

type VoiceMessageRendererProps = {
  message: ExedMessageItem
  isSelfMsg?: boolean
}

const props = defineProps<VoiceMessageRendererProps>()
const { t } = useI18n()

const audioRef = ref<HTMLAudioElement>()
const isPlaying = ref(false)

const soundElem = computed(() => props.message.soundElem)
const audioUrl = computed(
  () => soundElem.value?.sourceUrl || soundElem.value?.soundPath || '',
)
const duration = computed(() =>
  Math.max(1, Math.min(60, Math.round(soundElem.value?.duration || 1))),
)
const durationLabel = computed(() => `${duration.value}"`)
const bubbleWidth = computed(() => {
  const minWidth = 86
  const maxWidth = Math.min(220, window.innerWidth * 0.67)
  return Math.round(Math.min(maxWidth, minWidth + duration.value * 2.4))
})

const cleanupAudio = () => {
  if (!audioRef.value) {
    return
  }
  audioRef.value.pause()
  audioRef.value.onended = null
  audioRef.value.onerror = null
  audioRef.value = undefined
}

const ensureAudio = () => {
  if (audioRef.value) {
    return audioRef.value
  }
  if (!audioUrl.value) {
    feedbackToast({
      error: new Error('voice url missing'),
      message: t('messageTip.failLoad'),
    })
    return
  }

  const audio = new Audio(audioUrl.value)
  audio.preload = 'metadata'
  audio.onended = () => {
    isPlaying.value = false
    audio.currentTime = 0
  }
  audio.onerror = () => {
    isPlaying.value = false
    feedbackToast({
      error: new Error('voice play failed'),
      message: t('messageTip.failLoad'),
    })
  }
  audioRef.value = audio
  return audio
}

const togglePlay = async () => {
  const audio = ensureAudio()
  if (!audio) {
    return
  }

  try {
    if (isPlaying.value) {
      audio.pause()
      isPlaying.value = false
      return
    }

    await audio.play()
    isPlaying.value = true
  } catch (error) {
    isPlaying.value = false
    feedbackToast({
      error,
      message: t('messageTip.failLoad'),
    })
  }
}

watch(audioUrl, () => {
  cleanupAudio()
  isPlaying.value = false
})

onBeforeUnmount(() => {
  cleanupAudio()
})
</script>

<style lang="scss" scoped>
.voice_message {
  min-width: 86px;
  max-width: min(67vw, 220px);
  min-height: 42px;
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  background: #f4f5f7;
  color: #0c1c33;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.voice_message_self {
  background: #cce7fe;
}

.voice_message__icon {
  font-size: 20px;
  color: #0089ff;
  flex-shrink: 0;
}

.voice_message_self .voice_message__icon {
  color: #0c1c33;
}

.voice_message__bar {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.35;
  flex-shrink: 0;
}

.voice_message_playing .voice_message__bar {
  animation: voicePulse 0.9s ease-in-out infinite;
}

.voice_message__duration {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
}

@keyframes voicePulse {
  0%,
  100% {
    transform: scaleY(1);
    opacity: 0.35;
  }

  50% {
    transform: scaleY(3.4);
    opacity: 0.9;
  }
}
</style>
