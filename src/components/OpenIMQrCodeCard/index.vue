<template>
  <div
    class="mx-auto mt-5 w-[calc(100%-32px)] max-w-[360px] rounded-[20px] bg-white px-6 pb-6 pt-7 shadow-[0_10px_30px_rgba(12,28,51,0.08)]"
  >
    <div class="flex items-center">
      <Avatar
        :size="48"
        :src="avatar"
        :desc="title"
        :is-group="isGroup"
      />
      <div class="ml-3 min-w-0 flex-1 text-[20px] font-semibold text-[#0C1C33]">
        <div class="truncate">{{ title }}</div>
      </div>
    </div>

    <div class="mt-10 text-center text-[15px] leading-6 text-sub-text">
      {{ hint }}
    </div>

    <div class="mt-5 flex justify-center">
      <div
        class="rounded-[18px] border-[4px] border-[#E8EAEF] bg-white p-[10px] shadow-[0_8px_24px_rgba(12,28,51,0.06)]"
      >
        <canvas
          ref="canvasRef"
          :width="canvasSize"
          :height="canvasSize"
          :style="{
            width: `${canvasSize}px`,
            height: `${canvasSize}px`,
          }"
        />
      </div>
    </div>

    <div
      class="mt-6 flex items-center justify-between rounded-[16px] bg-[#F8F9FA] px-4 py-3"
      @click="copy(idValue)"
    >
      <div class="min-w-0 flex-1">
        <div class="text-xs text-sub-text">{{ idLabel }}</div>
        <div class="mt-1 truncate text-sm text-[#0C1C33]">
          {{ idValue }}
        </div>
      </div>
      <img class="ml-3 h-5 w-5" :src="copyIcon" alt="copy" />
    </div>
  </div>
</template>

<script setup lang="ts">
import UQRCode from 'uqrcodejs'
import Avatar from '@/components/Avatar/index.vue'
import copyIcon from '@assets/images/profile/copy.png'
import { useCopy } from '@/utils/common'

type OpenIMQrCodeCardProps = {
  title: string
  avatar?: string
  qrContent: string
  hint: string
  idLabel: string
  idValue: string
  isGroup?: boolean
}

const props = withDefaults(defineProps<OpenIMQrCodeCardProps>(), {
  avatar: '',
  isGroup: false,
})

const { copy } = useCopy()

const canvasRef = ref<HTMLCanvasElement>()
const canvasSize = 250

const renderQrCode = async () => {
  await nextTick()

  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')

  if (!canvas || !ctx || !props.qrContent) return

  ctx.clearRect(0, 0, canvasSize, canvasSize)

  const qr = new UQRCode()
  qr.data = props.qrContent
  qr.size = canvasSize
  qr.make()
  qr.canvasContext = ctx
  qr.drawCanvas()
}

watch(
  () => props.qrContent,
  () => {
    renderQrCode()
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped></style>
