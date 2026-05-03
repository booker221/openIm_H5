<template>
  <div class="z-10 mb-[48px] flex flex-row justify-around px-2">
    <div class="flex flex-col items-center" @click.stop="changeMic">
      <img
        class="h-[62px] w-[62px]"
        :src="isMicrophoneEnabled ? mic_open : mic_close"
        alt="mic"
      />
      <span class="mt-2 text-sm text-white">{{
        isMicrophoneEnabled ? $t('rtc.micOpen') : $t('rtc.micClose')
      }}</span>
    </div>
    <div class="flex flex-col items-center" @click.stop="disconnect">
      <img class="h-[62px] w-[62px]" :src="hungup" alt="hungup" />
      <span class="mt-2 text-sm text-white">{{ $t('rtc.hungup') }}</span>
    </div>
    <div class="flex flex-col items-center" @click.stop="toggleSound">
      <img
        class="h-[62px] w-[62px]"
        :src="soundStatus ? sound_open : sound_close"
        alt="sound"
      />
      <span class="mt-2 text-sm text-white">{{
        soundStatus ? $t('rtc.soundOpen') : $t('rtc.soundClose')
      }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import sound_open from '@/assets/images/rtc/sound_open.png'
import sound_close from '@/assets/images/rtc/sound_close.png'
import mic_open from '@/assets/images/rtc/mic_open.png'
import mic_close from '@/assets/images/rtc/mic_close.png'
import hungup from '@/assets/images/rtc/hungup.png'
import { feedbackToast } from '@/utils/common'
import { useLocalParticipant } from '@/utils/open-im-rtc'
import { Participant, Room, RoomEvent } from 'livekit-client'

type IRtcConnectedEmits = {
  (event: 'disconnect'): void
}
type IRtcConnectedProps = {
  room: Room
}
const emit = defineEmits<IRtcConnectedEmits>()
const props = defineProps<IRtcConnectedProps>()

const { t } = useI18n()
const speakerMuted = ref(false)
const canPlaybackAudio = ref(props.room.canPlaybackAudio)
const { localParticipant, isMicrophoneEnabled } = useLocalParticipant(props.room)
const soundStatus = computed(() => canPlaybackAudio.value && !speakerMuted.value)

const changeMic = async () =>
  localParticipant.value.setMicrophoneEnabled(!isMicrophoneEnabled.value)

const disconnect = () => emit('disconnect')

const getAllParticipants = () => {
  const remoteParticipants = Array.from(props.room.participants.values())
  return [props.room.localParticipant, ...remoteParticipants] as Participant[]
}

const setAttachedAudioMuted = (muted: boolean) => {
  getAllParticipants().forEach((participant) => {
    participant.audioTracks.forEach((publication) => {
      publication.track?.attachedElements.forEach((element) => {
        element.muted = muted
      })
    })
  })
}

const resumeAudioPlayback = async () => {
  try {
    await props.room.startAudio()
    speakerMuted.value = false
    canPlaybackAudio.value = true
    setAttachedAudioMuted(false)
  } catch (error) {
    canPlaybackAudio.value = false
    feedbackToast({ message: t('rtc.audioResumeHint'), error })
  }
}

const toggleSound = async () => {
  if (soundStatus.value) {
    speakerMuted.value = true
    setAttachedAudioMuted(true)
    return
  }

  await resumeAudioPlayback()
}

const audioPlaybackStatusChangedHandler = (status: boolean) => {
  canPlaybackAudio.value = status

  if (status && !speakerMuted.value) {
    setAttachedAudioMuted(false)
  }
}

onMounted(() => {
  const loudspeaker = props.room.getActiveDevice('audiooutput')
  if (loudspeaker) {
    props.room.switchActiveDevice('audiooutput', loudspeaker)
  }
  props.room.on(RoomEvent.AudioPlaybackStatusChanged, audioPlaybackStatusChangedHandler)
  resumeAudioPlayback()
})

onUnmounted(() => {
  props.room.off(RoomEvent.AudioPlaybackStatusChanged, audioPlaybackStatusChangedHandler)
})
</script>
