<template>
  <div class="page_container">
    <img :src="bg" mode="" />

    <view
      class="mx-auto mt-[-60px] flex h-[98px] w-[90%] items-center rounded-md bg-white pl-4 pr-2"
    >
      <Avatar
        :size="46"
        :src="userStore.storeSelfInfo.faceURL"
        :desc="userStore.storeSelfInfo.nickname"
      />

      <view
        class="id_row ml-2 flex h-[46px] flex-1 flex-col items-start justify-between"
      >
        <text class="nickname">{{ userStore.storeSelfInfo.nickname }}</text>
        <view class="flex items-center" @click="copyUserID">
          <text class="text-sm text-sub-text">{{
            userStore.storeSelfInfo.userID
          }}</text>
          <img style="width: 16px; height: 16px" :src="copy_icon" mode="" />
        </view>
      </view>

      <view
        v-if="walletEnabled"
        class="flex h-[46px] min-w-[92px] flex-col items-end justify-between"
        @click="menuClick('/myWallet')"
      >
        <text class="text-xs text-sub-text">{{ $t('profileMenu.balance') }}</text>
        <text class="text-[18px] font-medium text-[#0C1C33]">¥{{ walletAmount }}</text>
      </view>
    </view>

    <div class="mx-auto mt-[10px] w-[90%] rounded-md bg-white">
      <div
        v-for="menu in profileMenus"
        :key="menu.title"
        class="flex items-center justify-between p-4"
        @click="menuClick(menu.route)"
      >
        <div class="flex">
          <img
            v-if="menu.imageIcon"
            class="h-[22px] w-[22px]"
            :src="menu.imageIcon"
            alt=""
          />
          <van-icon v-else :name="menu.icon" size="22" color="#0C1C33" />
          <span class="ml-3">{{ menu.title }}</span>
        </div>
        <img :src="back" width="24" alt="back" />
      </div>
    </div>
  </div>
</template>

<script name="profile" setup lang="ts">
import Avatar from '@/components/Avatar/index.vue'
import back from '@assets/images/profile/back.png'
import copy_icon from '@assets/images/profile/copy.png'
import bg from '@assets/images/profile/bg.png'
import qr_code from '@assets/images/profile/qr_code.png'

import { showConfirmDialog, showToast } from 'vant'
import useUserStore from '@/store/modules/user'
import { useClipboard } from '@vueuse/core'
import useAppConfigStore from '@/store/modules/appConfig'
import { getWalletBalance } from '@/api/wallet'

const { copy, isSupported } = useClipboard()
const { t } = useI18n()

const router = useRouter()
const userStore = useUserStore()
const appConfigStore = useAppConfigStore()
const walletBalance = ref(0)
const walletEnabled = computed(() => !!appConfigStore.storeAppConfig?.wallet)
const walletAmount = computed(() => (walletBalance.value / 100).toFixed(2))

type ProfileMenu = {
  icon: string
  imageIcon?: string
  title: string
  route?: string
}

const profileMenus = computed(() => {
  const menus: ProfileMenu[] = [
    {
      icon: 'contact',
      title: t('profileMenu.personalInformation'),
      route: '/selfInfoDetails',
    },
    {
      icon: '',
      imageIcon: qr_code,
      title: t('profileMenu.myQrCode'),
      route: '/myQrCode',
    },
  ]

  if (walletEnabled.value) {
    menus.push(
      {
        icon: 'balance-pay',
        title: t('profileMenu.myWallet'),
        route: '/myWallet',
      },
      {
        icon: 'coupon-o',
        title: t('profileMenu.receivingAccount'),
        route: '/setWithdrawAccount',
      },
      {
        icon: 'idcard',
        title: t('profileMenu.realNameAuth'),
        route: '/realNameAuth',
      },
    )
  }

  menus.push(
    {
      icon: 'star-o',
      title: t('profileMenu.myFavorites'),
      route: '/myFavorites',
    },
    {
      icon: 'setting-o',
      title: t('profileMenu.accountSetting'),
      route: '/accountSettings',
    },
    {
      icon: 'info-o',
      title: t('profileMenu.aboutUs'),
      route: '/about',
    },
    {
      icon: 'revoke',
      title: t('profileMenu.logOut'),
    },
  )

  return menus
})

const menuClick = (route?: string) => {
  if (route) {
    router.push(route)
  } else {
    tryLogout()
  }
}

const copyUserID = () => {
  if (isSupported) {
    copy(userStore.storeSelfInfo.userID)
  }
  showToast(
    isSupported ? t('messageTip.copySuccess') : t('messageTip.environmentNotSupported'),
  )
}

const loadWalletBalance = async () => {
  if (!walletEnabled.value) return
  try {
    const { data } = await getWalletBalance()
    walletBalance.value = data?.balance ?? 0
  } catch (error) {
    walletBalance.value = 0
  }
}

const tryLogout = () => {
  showConfirmDialog({
    message: t('messageTip.tryLogout'),
    beforeClose: (action: string) => {
      return new Promise((resolve) => {
        if (action !== 'confirm') {
          resolve(true)
          return
        }
        userStore.userLogout().finally(() => {
          resolve(true)
          router.push('/login')
        })
      })
    },
  }).catch(() => {})
}

watch(
  walletEnabled,
  (enabled) => {
    if (enabled) {
      loadWalletBalance()
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (!appConfigStore.storeLoaded) {
    appConfigStore.fetchAppConfig(true)
  }
})
</script>

<style lang="scss" scoped></style>
