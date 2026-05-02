<template>
  <div class="page_container min-h-full bg-[#f8f9fa]">
    <NavBar :title="$t('profileMenu.receivingAccount')" />

    <div class="px-4 pb-6 pt-3">
      <div class="rounded-md bg-white p-4">
        <div class="mb-2 text-sm text-sub-text">{{ $t('profileMenu.alipayAccount') }}</div>
        <van-field
          v-model="account"
          class="rounded-lg bg-[#f4f7fb]"
          :placeholder="$t('messageTip.inputWithdrawAccount')"
        />
      </div>

      <div class="mt-5">
        <van-button
          block
          type="primary"
          :loading="submitting"
          :disabled="!account.trim()"
          @click="submit"
        >
          {{ $t('buttons.save') }}
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar/index.vue'
import { getWalletInfo, setWithdrawAccount } from '@/api/wallet'
import { feedbackToast } from '@/utils/common'

const { t } = useI18n()
const router = useRouter()
const account = ref('')
const submitting = ref(false)

const loadWalletInfo = async () => {
  try {
    const { data } = await getWalletInfo()
    account.value = data?.withdrawAccount ?? ''
  } catch (error) {}
}

const submit = async () => {
  const value = account.value.trim()
  if (!value) {
    feedbackToast({
      message: t('messageTip.inputWithdrawAccount'),
      error: t('messageTip.inputWithdrawAccount'),
    })
    return
  }

  submitting.value = true
  try {
    await setWithdrawAccount(value)
    feedbackToast({
      message: t('messageTip.changeSuccess'),
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
