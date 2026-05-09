<template>
  <div class="page_container bg-[#F8F9FA]">
    <NavBar :title="$t('scanQrCode')" />

    <div class="flex-1 overflow-y-auto px-4 pb-6 pt-4">
      <div class="scanner_shell">
        <QrStream
          v-if="cameraMode !== 'off'"
          class="scanner_stream"
          :camera="cameraMode"
          :track="false"
          @decode="handleDecode"
          @init="handleCameraInit"
        />

        <div v-else class="scanner_placeholder">
          <van-icon name="photo-fail" size="44" color="#FFF" />
          <div class="mt-4 max-w-[240px] text-center text-sm leading-6 text-white/80">
            {{ cameraErrorMessage }}
          </div>
        </div>

        <div class="scanner_mask">
          <div class="scanner_frame"></div>
        </div>
      </div>

      <div class="mt-4 text-center text-sm leading-6 text-sub-text">
        {{ cameraErrorMessage || $t('scanGuide') }}
      </div>

      <div class="mt-5 grid grid-cols-2 gap-3">
        <van-button
          round
          type="primary"
          plain
          class="!h-11"
          @click="openAlbumPicker"
        >
          {{ $t('scanFromAlbum') }}
        </van-button>
        <van-button round type="primary" class="!h-11" @click="showManualPopup = true">
          {{ $t('enterQrCodeContent') }}
        </van-button>
      </div>

      <div
        v-if="!isSecureCameraContext"
        class="mt-3 rounded-[16px] bg-white px-4 py-3 text-xs leading-5 text-sub-text"
      >
        {{ secureContextTip }}
      </div>
    </div>

    <QrCapture
      ref="captureRef"
      class="scan_capture"
      @decode="handleDecode"
    />

    <van-popup v-model:show="showManualPopup" round position="bottom">
      <div class="px-5 pb-6 pt-5">
        <div class="text-[18px] font-semibold text-[#0C1C33]">
          {{ $t('enterQrCodeContent') }}
        </div>
        <van-field
          v-model="manualContent"
          class="mt-4 rounded-[16px] bg-[#F8F9FA]"
          type="textarea"
          rows="4"
          autosize
          maxlength="300"
          show-word-limit
          :placeholder="$t('enterQrCodeContent')"
        />
        <van-button
          block
          type="primary"
          class="mt-4"
          :disabled="!manualContent.trim()"
          @click="submitManualContent"
        >
          {{ $t('buttons.confirm') }}
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar/index.vue'
import useContactStore from '@/store/modules/contact'
import useConversationStore from '@/store/modules/conversation'
import { IMSDK } from '@/utils/imCommon'
import { getBusinessInfo } from '@/api/user'
import { QrCapture, QrStream } from 'vue3-qr-reader'
import { parseOpenIMQrCode } from '@/constants/qrcode'
import { showLoadingToast, showToast } from 'vant'

const { t } = useI18n()
const router = useRouter()
const contactStore = useContactStore()
const conversationStore = useConversationStore()

const captureRef = ref<any>(null)
const showManualPopup = ref(false)
const manualContent = ref('')
const cameraEnabled = ref(true)
const cameraErrorMessage = ref('')
const resolving = ref(false)
const lastScanContent = ref('')
const lastScanAt = ref(0)

const scanCooldownMs = 1000
const isSecureCameraContext = window.isSecureContext
const secureContextTip = computed(() => t('messageTip.cameraRequiresSecureContext'))
const cameraMode = computed(() => (cameraEnabled.value ? 'rear' : 'off'))

const resetScannerState = (delay = 500) => {
  window.setTimeout(() => {
    resolving.value = false
  }, delay)
}

const markScanRecord = (content: string) => {
  lastScanContent.value = content
  lastScanAt.value = Date.now()
}

const shouldIgnoreScan = (content: string) => {
  return (
    content === lastScanContent.value &&
    Date.now() - lastScanAt.value < scanCooldownMs
  )
}

const handleUserQrCode = async (userID: string) => {
  const loadingToast = showLoadingToast({
    duration: 0,
    forbidClick: true,
    message: t('loading'),
  })

  try {
    const { data: users } = await IMSDK.getUsersInfo([userID])
    const userInfo = users?.[0]

    if (!userInfo?.userID) {
      throw new Error('user not found')
    }

    let businessInfo = {}
    try {
      const { data } = await getBusinessInfo(userID)
      businessInfo = data?.users?.[0] ?? {}
    } catch (error) {
      businessInfo = {}
    }

    loadingToast.close()

    contactStore.setUserCardData({
      baseInfo: {
        ...userInfo,
        ...businessInfo,
      },
    })
  } catch (error) {
    loadingToast.close()
    showToast({
      type: 'fail',
      message: t('messageTip.qrCodeUserNotFound'),
    })
    resetScannerState()
  }
}

const handleGroupQrCode = async (groupID: string) => {
  const loadingToast = showLoadingToast({
    duration: 0,
    forbidClick: true,
    message: t('loading'),
  })

  try {
    const { data } = await IMSDK.getSpecifiedGroupsInfo([groupID])
    const groupInfo = data?.[0]

    if (!groupInfo?.groupID) {
      throw new Error('group not found')
    }

    conversationStore.updateCurrentGroupInfo(groupInfo)
    loadingToast.close()

    router.push({
      path: '/groupCard',
      query: {
        isScan: 'true',
      },
    })
  } catch (error) {
    loadingToast.close()
    showToast({
      type: 'fail',
      message: t('messageTip.qrCodeGroupNotFound'),
    })
    resetScannerState()
  }
}

const resolveScanContent = async (rawContent: string) => {
  const content = rawContent.trim()

  if (!content || resolving.value || shouldIgnoreScan(content)) {
    return
  }

  const parseResult = parseOpenIMQrCode(content)

  if (!parseResult) {
    markScanRecord(content)
    resolving.value = true
    showToast({
      type: 'fail',
      message: t('messageTip.qrCodeInvalid'),
    })
    resetScannerState()
    return
  }

  markScanRecord(content)
  resolving.value = true

  if (parseResult.type === 'friend') {
    await handleUserQrCode(parseResult.id)
    return
  }

  await handleGroupQrCode(parseResult.id)
}

const handleDecode = (result: string) => {
  resolveScanContent(result)
}

const handleCameraInit = async (promise: Promise<unknown>) => {
  try {
    await promise
    cameraErrorMessage.value = ''
  } catch (error: any) {
    cameraEnabled.value = false

    if (!isSecureCameraContext) {
      cameraErrorMessage.value = t('messageTip.cameraRequiresSecureContext')
      return
    }

    cameraErrorMessage.value = t('messageTip.cameraInitFailed')
  }
}

const openAlbumPicker = () => {
  const inputEl = captureRef.value?.$el as HTMLInputElement | undefined
  inputEl?.click?.()
}

const submitManualContent = () => {
  const value = manualContent.value.trim()
  if (!value) {
    showToast({
      type: 'fail',
      message: t('messageTip.inputEmpty'),
    })
    return
  }

  showManualPopup.value = false
  manualContent.value = ''
  resolveScanContent(value)
}

onBeforeMount(() => {
  if (!isSecureCameraContext) {
    cameraEnabled.value = false
    cameraErrorMessage.value = t('messageTip.cameraRequiresSecureContext')
  }
})
</script>

<style lang="scss" scoped>
.scanner_shell {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  background: linear-gradient(180deg, #0c1c33 0%, #182f54 100%);
  aspect-ratio: 1 / 1.18;
}

.scanner_stream,
.scanner_placeholder,
.scanner_mask {
  position: absolute;
  inset: 0;
}

.scanner_placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.scanner_mask {
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.scanner_frame {
  position: relative;
  width: min(70vw, 260px);
  height: min(70vw, 260px);
  border: 2px solid rgba(255, 255, 255, 0.28);
  border-radius: 24px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.28);
}

.scanner_frame::before,
.scanner_frame::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 24px;
}

.scanner_frame::before {
  border-top: 4px solid #fff;
  border-left: 4px solid #fff;
  width: 34px;
  height: 34px;
}

.scanner_frame::after {
  right: 0;
  bottom: 0;
  left: auto;
  top: auto;
  width: 34px;
  height: 34px;
  border-right: 4px solid #fff;
  border-bottom: 4px solid #fff;
}

.scan_capture {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
}

.scanner_stream:deep(video) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
