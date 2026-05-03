<template>
  <div class="page_container">
    <NavBar :title="$t('scanQrCode')">
      <span class="text-sm text-primary" @click="router.push('/myQrCode')">
        {{ $t('profileMenu.myQrCode') }}
      </span>
    </NavBar>

    <div class="flex-1 overflow-y-auto px-[22px] py-4">
      <div class="rounded-[24px] bg-[#0C1C33] p-4 text-white">
        <div class="relative h-[52vh] min-h-[320px] overflow-hidden rounded-[18px] bg-black">
          <QrStream
            v-if="showScanner"
            class="h-full w-full"
            :camera="cameraMode"
            :torch="torchEnabled"
            :track="false"
            @decode="onDecode"
            @init="onInit"
          >
            <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                class="h-[220px] w-[220px] rounded-[28px] border border-white/70 shadow-[0_0_0_9999px_rgba(12,28,51,0.36)]"
              ></div>
            </div>
          </QrStream>

          <div
            v-else
            class="flex h-full flex-col items-center justify-center px-6 text-center"
          >
            <div class="text-lg font-medium">{{ $t('messageTip.cameraInitFailed') }}</div>
            <div class="mt-2 text-sm text-white/70">
              {{ cameraErrorMessage || $t('messageTip.environmentNotSupported') }}
            </div>
            <van-button class="mt-5" type="primary" size="small" @click="enableCamera">
              {{ $t('buttons.confirm') }}
            </van-button>
          </div>
        </div>

        <div class="mt-4 text-center text-sm text-white/75">
          {{ $t('scanGuide') }}
        </div>

        <div class="mt-4 flex gap-3">
          <van-button
            v-if="supportsTorch"
            class="!flex-1"
            size="small"
            plain
            type="primary"
            @click="torchEnabled = !torchEnabled"
          >
            {{ $t(torchEnabled ? 'offFlash' : 'onFlash') }}
          </van-button>

          <van-button class="!flex-1" size="small" plain type="primary" @click="enableCamera">
            {{ $t('buttons.clear') }}
          </van-button>
        </div>
      </div>

      <div class="mt-4 rounded-[18px] bg-white p-4">
        <div class="mb-3 text-sm font-medium text-[#0C1C33]">{{ $t('scanFromAlbum') }}</div>
        <label
          class="relative flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#C8D3E5] bg-[#F8F9FA] px-4 py-5 text-center text-sm text-sub-text"
        >
          <QrCapture class="absolute inset-0 h-full w-full cursor-pointer opacity-0" @decode="onDecode" />
          {{ $t('scanQrCodeDesc') }}
        </label>
      </div>

      <div class="mt-4 rounded-[18px] bg-white p-4">
        <div class="mb-3 text-sm font-medium text-[#0C1C33]">{{ $t('enterQrCodeContent') }}</div>
        <van-field
          v-model="manualContent"
          type="textarea"
          rows="3"
          autosize
          maxlength="300"
          :placeholder="$t('enterQrCodeContent')"
          show-word-limit
        />
        <van-button class="mt-4 w-full" type="primary" @click="submitManualContent">
          {{ $t('buttons.confirm') }}
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar/index.vue'
import { getBusinessInfo } from '@/api/user'
import useContactStore from '@/store/modules/contact'
import useConversationStore from '@/store/modules/conversation'
import { feedbackToast } from '@/utils/common'
import { IMSDK } from '@/utils/imCommon'
import { parseOpenIMQrCode } from '@/utils/qrCode'
import { QrCapture, QrStream } from 'vue3-qr-reader'

const { t } = useI18n()
const router = useRouter()
const contactStore = useContactStore()
const conversationStore = useConversationStore()

const manualContent = ref('')
const cameraMode = ref<'rear' | 'off'>('rear')
const torchEnabled = ref(false)
const supportsTorch = ref(false)
const cameraErrorMessage = ref('')
const isHandlingResult = ref(false)
const lastContent = ref('')
const lastHandledAt = ref(0)

const showScanner = computed(() => cameraMode.value !== 'off')

const enableCamera = () => {
  cameraErrorMessage.value = ''
  torchEnabled.value = false
  cameraMode.value = 'rear'
}

const resetAfterFailure = () => {
  window.setTimeout(() => {
    if (cameraErrorMessage.value) return
    enableCamera()
  }, 400)
}

const openUserCard = async (userID: string) => {
  const { data: imUsers } = await IMSDK.getUsersInfo([userID])
  const userInfo = imUsers[0]
  if (!userInfo) {
    throw new Error('User not found')
  }

  let businessInfo = {}
  try {
    const { data } = await getBusinessInfo(userID)
    businessInfo = data.users[0] ?? {}
  } catch (error) {
    console.error('Failed to fetch business user info', error)
  }

  contactStore.setUserCardData({
    baseInfo: {
      ...userInfo,
      ...businessInfo,
    },
  })
}

const openGroupCard = async (groupID: string) => {
  const { data } = await IMSDK.getSpecifiedGroupsInfo([groupID])
  const groupInfo = data[0]
  if (!groupInfo) {
    throw new Error('Group not found')
  }

  conversationStore.updateCurrentGroupInfo(groupInfo)
  router.push('/groupCard')
}

const handleDecodedContent = async (rawContent: string) => {
  const content = rawContent.trim()
  if (!content || isHandlingResult.value) return

  const now = Date.now()
  if (lastContent.value === content && now - lastHandledAt.value < 1000) {
    return
  }

  lastContent.value = content
  lastHandledAt.value = now
  isHandlingResult.value = true
  cameraMode.value = 'off'

  try {
    const result = parseOpenIMQrCode(content)
    if (!result) {
      feedbackToast({ message: t('messageTip.qrCodeInvalid'), error: true })
      resetAfterFailure()
      return
    }

    if (result.type === 'friend') {
      await openUserCard(result.id)
      return
    }

    await openGroupCard(result.id)
  } catch (error) {
    const parsed = parseOpenIMQrCode(content)
    const message =
      parsed?.type === 'group'
        ? t('messageTip.qrCodeGroupNotFound')
        : t('messageTip.qrCodeUserNotFound')

    feedbackToast({
      message,
      error,
    })
    resetAfterFailure()
  } finally {
    isHandlingResult.value = false
  }
}

const onDecode = (content: string) => {
  handleDecodedContent(content)
}

const onInit = async (promise: Promise<{ capabilities?: { torch?: boolean } }>) => {
  try {
    const { capabilities } = await promise
    supportsTorch.value = !!capabilities?.torch
    cameraErrorMessage.value = ''
  } catch (error: any) {
    cameraMode.value = 'off'
    cameraErrorMessage.value =
      error?.message || t('messageTip.environmentNotSupported')
  }
}

const submitManualContent = () => {
  if (!manualContent.value.trim()) {
    feedbackToast({ message: t('messageTip.inputEmpty'), error: true })
    return
  }
  handleDecodedContent(manualContent.value)
}
</script>
