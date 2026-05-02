<template>
  <div class="page_container min-h-full bg-[#f8f9fa]">
    <NavBar :title="$t('profileMenu.myWallet')" />

    <div class="px-4 pb-6 pt-3">
      <div
        class="rounded-lg bg-gradient-to-r from-[#2B5EE6] to-[#1DE8DE] px-6 py-5 text-white"
      >
        <div class="text-sm opacity-90">{{ $t('profileMenu.availableBalance') }}</div>
        <div class="mt-2 text-[32px] font-semibold">¥{{ balanceAmount }}</div>
      </div>

      <div class="mt-3 overflow-hidden rounded-md bg-white">
        <SettingRowItem
          border
          :title="$t('profileMenu.receivingAccount')"
          :subTitle="withdrawAccountText"
          @clickItem="$router.push('/setWithdrawAccount')"
        />
        <SettingRowItem
          :title="$t('profileMenu.realNameAuth')"
          :subTitle="realNameAuthText"
          @clickItem="$router.push('/realNameAuth')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar/index.vue'
import SettingRowItem from '@/components/SettingRowItem/index.vue'
import { getWalletBalance, getWalletInfo } from '@/api/wallet'
import type { WalletInfoData } from '@/api/data'

const { t } = useI18n()
const walletBalance = ref(0)
const walletInfo = ref<WalletInfoData | null>(null)

const balanceAmount = computed(() => (walletBalance.value / 100).toFixed(2))

const getAccountTypeText = (type?: number) => {
  switch (type) {
    case 1:
      return '支付宝'
    case 2:
      return '微信'
    case 3:
      return '银行卡'
    default:
      return ''
  }
}

const getAuditStatusText = (status?: number) => {
  switch (status) {
    case 0:
      return '待审核'
    case 1:
      return '审核通过'
    case 2:
      return '审核未通过'
    default:
      return ''
  }
}

const withdrawAccountText = computed(() => {
  const account = walletInfo.value?.withdrawAccount
  if (!account) return t('profileMenu.notSet')

  const typeText = getAccountTypeText(walletInfo.value?.withdrawAccountType)
  return typeText ? `${typeText} ${account}` : account
})

const realNameAuthText = computed(() => {
  const auth = walletInfo.value?.realNameAuth
  if (!auth?.name) return t('profileMenu.notAuthenticated')
  return getAuditStatusText(auth.auditStatus) || t('profileMenu.notAuthenticated')
})

const loadWalletData = async () => {
  try {
    const [balanceRes, infoRes] = await Promise.all([getWalletBalance(), getWalletInfo()])
    walletInfo.value = infoRes.data ?? null
    walletBalance.value = infoRes.data?.balance ?? balanceRes.data?.balance ?? 0
  } catch (error) {
    walletInfo.value = null
    walletBalance.value = 0
  }
}

onMounted(loadWalletData)
onActivated(loadWalletData)
</script>
