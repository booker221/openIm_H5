<template>
  <div class="page_container min-h-full bg-[#f8f9fa]">
    <NavBar :title="$t('profileMenu.realNameAuth')" />

    <div class="px-4 pb-6 pt-3">
      <div class="rounded-md bg-white p-4">
        <div class="text-sm text-sub-text">{{ authStatusText }}</div>

        <div class="mt-5">
          <div class="mb-2 text-sm text-sub-text">{{ $t('profileMenu.realName') }}</div>
          <van-field
            v-model="realName"
            class="rounded-lg bg-[#f4f7fb]"
            :placeholder="$t('messageTip.inputRealName')"
          />
        </div>

        <div class="mt-5">
          <div class="mb-2 text-sm text-sub-text">{{ $t('profileMenu.idCardNumber') }}</div>
          <van-field
            v-model="idCard"
            class="rounded-lg bg-[#f4f7fb]"
            :placeholder="$t('messageTip.inputIDCard')"
          />
        </div>

        <div class="mt-5">
          <div class="mb-2 text-sm text-sub-text">{{ $t('profileMenu.idCardFront') }}</div>
          <van-uploader
            v-model="frontFileList"
            :max-count="1"
            :after-read="afterReadFront"
            @delete="clearFront"
          />
          <div class="mt-2 text-xs text-sub-text">{{ $t('profileMenu.uploadFrontHint') }}</div>
        </div>

        <div class="mt-5">
          <div class="mb-2 text-sm text-sub-text">{{ $t('profileMenu.idCardBack') }}</div>
          <van-uploader
            v-model="backFileList"
            :max-count="1"
            :after-read="afterReadBack"
            @delete="clearBack"
          />
          <div class="mt-2 text-xs text-sub-text">{{ $t('profileMenu.uploadBackHint') }}</div>
        </div>
      </div>

      <div class="mt-5">
        <van-button
          block
          type="primary"
          :loading="submitting"
          @click="submit"
        >
          {{ $t('buttons.save') }}
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UploaderFileListItem } from 'vant'
import { closeToast, showLoadingToast } from 'vant'
import { v4 as uuidV4 } from 'uuid'
import NavBar from '@/components/NavBar/index.vue'
import { getWalletInfo, realNameAuth } from '@/api/wallet'
import type { WalletInfoData } from '@/api/data'
import { feedbackToast, getFileType } from '@/utils/common'
import { IMSDK } from '@/utils/imCommon'

const { t } = useI18n()
const router = useRouter()

const walletInfo = ref<WalletInfoData | null>(null)
const realName = ref('')
const idCard = ref('')
const frontUrl = ref('')
const backUrl = ref('')
const frontFileList = ref<UploaderFileListItem[]>([])
const backFileList = ref<UploaderFileListItem[]>([])
const submitting = ref(false)

const authStatusText = computed(() => {
  const auth = walletInfo.value?.realNameAuth
  if (!auth?.name) return t('profileMenu.notAuthenticated')

  switch (auth.auditStatus) {
    case 0:
      return t('profileMenu.pendingReview')
    case 1:
      return t('profileMenu.reviewPassed')
    case 2:
      return t('profileMenu.reviewRejected')
    default:
      return t('profileMenu.notAuthenticated')
  }
})

const syncWalletInfo = (info?: WalletInfoData | null) => {
  walletInfo.value = info ?? null
  const auth = info?.realNameAuth
  realName.value = auth?.name ?? ''
  idCard.value = auth?.idCard ?? ''
  frontUrl.value = auth?.idCardPhotoFront ?? ''
  backUrl.value = auth?.idCardPhotoBack ?? ''
  frontFileList.value = frontUrl.value ? [{ url: frontUrl.value }] : []
  backFileList.value = backUrl.value ? [{ url: backUrl.value }] : []
}

const loadWalletInfo = async () => {
  try {
    const { data } = await getWalletInfo()
    syncWalletInfo(data)
  } catch (error) {}
}

const uploadImage = async (
  fileData: UploaderFileListItem | UploaderFileListItem[],
  target: 'front' | 'back',
) => {
  const currentFile = Array.isArray(fileData) ? fileData[0] : fileData
  const file = currentFile.file as File | undefined
  if (!file) return

  showLoadingToast({
    message: t('uploading'),
    forbidClick: true,
    duration: 0,
  })

  try {
    const res = await IMSDK.uploadFile({
      name: `${Date.now()}${getFileType(file.name)}`,
      contentType: file.type,
      uuid: uuidV4(),
      file,
    })
    const url = res.data.url

    if (target === 'front') {
      frontUrl.value = url
      frontFileList.value = [{ url }]
    } else {
      backUrl.value = url
      backFileList.value = [{ url }]
    }
  } catch (error) {
    if (target === 'front') {
      clearFront()
    } else {
      clearBack()
    }
    feedbackToast({
      message: t('messageTip.uploadFailed'),
      error,
    })
  } finally {
    closeToast()
  }
}

const afterReadFront = (fileData: UploaderFileListItem | UploaderFileListItem[]) =>
  uploadImage(fileData, 'front')

const afterReadBack = (fileData: UploaderFileListItem | UploaderFileListItem[]) =>
  uploadImage(fileData, 'back')

const clearFront = () => {
  frontUrl.value = ''
  frontFileList.value = []
}

const clearBack = () => {
  backUrl.value = ''
  backFileList.value = []
}

const validateIdCard = (value: string) => {
  if (value.length === 18) {
    return /^\d{17}[\dXx]$/.test(value)
  }
  if (value.length === 15) {
    return /^\d{15}$/.test(value)
  }
  return false
}

const validateRealName = (value: string) => /^[\u4e00-\u9fa5]{2,20}$/.test(value)

const submit = async () => {
  const name = realName.value.trim()
  const idCardValue = idCard.value.trim().replaceAll('*', '')

  if (!name) {
    feedbackToast({ message: t('messageTip.inputRealName'), error: t('messageTip.inputRealName') })
    return
  }
  if (!validateRealName(name)) {
    feedbackToast({
      message: t('messageTip.correctRealName'),
      error: t('messageTip.correctRealName'),
    })
    return
  }
  if (!idCardValue) {
    feedbackToast({ message: t('messageTip.inputIDCard'), error: t('messageTip.inputIDCard') })
    return
  }
  if (!validateIdCard(idCardValue)) {
    feedbackToast({
      message: t('messageTip.correctIDCard'),
      error: t('messageTip.correctIDCard'),
    })
    return
  }
  if (!frontUrl.value) {
    feedbackToast({
      message: t('messageTip.uploadIDCardFront'),
      error: t('messageTip.uploadIDCardFront'),
    })
    return
  }
  if (!backUrl.value) {
    feedbackToast({
      message: t('messageTip.uploadIDCardBack'),
      error: t('messageTip.uploadIDCardBack'),
    })
    return
  }

  submitting.value = true
  try {
    const { data } = await realNameAuth({
      idCard: idCardValue,
      name,
      idCardPhotoFront: frontUrl.value,
      idCardPhotoBack: backUrl.value,
    })

    if (data && data.success === false) {
      feedbackToast({
        message: data.message || t('messageTip.changeFailed'),
        error: data.message || t('messageTip.changeFailed'),
      })
      return
    }

    feedbackToast({
      message: data?.message || t('messageTip.changeSuccess'),
      onClose: () => router.back(),
    })
  } catch (error) {
    feedbackToast({
      message: t('messageTip.changeFailed'),
      error,
    })
  } finally {
    submitting.value = false
  }
}

onMounted(loadWalletInfo)
</script>
