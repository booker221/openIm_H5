<template>
  <div class="page_container">
    <NavBar :title="$t('profileMenu.myQrCode')" />

    <div class="flex flex-1 items-start justify-center overflow-y-auto px-4 py-6">
      <div
        class="w-full max-w-[360px] rounded-[18px] bg-white px-6 pb-8 pt-7 shadow-[0_8px_24px_rgba(12,28,51,0.08)]"
      >
        <div class="flex items-center">
          <Avatar
            :size="52"
            :src="userStore.storeSelfInfo.faceURL"
            :desc="userStore.storeSelfInfo.nickname"
          />
          <div class="ml-3 min-w-0">
            <div class="truncate text-[20px] font-semibold text-[#0C1C33]">
              {{ userStore.storeSelfInfo.nickname }}
            </div>
            <div class="mt-1 text-sm text-sub-text">
              ID: {{ userStore.storeSelfInfo.userID }}
            </div>
          </div>
        </div>

        <div class="mt-8 text-center text-sm leading-6 text-sub-text">
          {{ $t('messageTip.scanQrCodeTip') }}
        </div>

        <div
          class="mx-auto mt-6 flex h-[270px] w-[270px] items-center justify-center rounded-[20px] border-4 border-[#E8EAEF] bg-white shadow-[0_10px_24px_rgba(12,28,51,0.06)]"
        >
          <canvas ref="canvasRef" width="240" height="240" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Avatar from '@/components/Avatar/index.vue'
import NavBar from '@/components/NavBar/index.vue'
import useUserStore from '@/store/modules/user'
import { buildFriendQrContent } from '@/utils/qrCode'

const userStore = useUserStore()

const canvasRef = ref<HTMLCanvasElement>()

const drawQrCode = async () => {
  const userID = userStore.storeSelfInfo.userID
  const canvas = canvasRef.value
  if (!canvas || !userID) return

  const { default: UQRCode } = await import('uqrcodejs')
  const qr = new UQRCode()
  const context = canvas.getContext('2d')
  if (!context) return

  context.clearRect(0, 0, canvas.width, canvas.height)

  qr.data = buildFriendQrContent(userID)
  qr.size = canvas.width
  qr.make()
  qr.canvasContext = context
  qr.drawCanvas()
}

watch(
  () => userStore.storeSelfInfo.userID,
  async (userID) => {
    if (!userID) {
      await userStore.getSelfInfoFromReq()
    }
    await nextTick()
    drawQrCode()
  },
  {
    immediate: true,
  },
)
</script>
