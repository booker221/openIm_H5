<template>
  <div class="page_container bg-[#F8F9FA]">
    <NavBar :title="$t('qrCode')" />
    <div class="flex-1 overflow-y-auto pb-6">
      <OpenIMQrCodeCard
        :title="userStore.storeSelfInfo.nickname"
        :avatar="userStore.storeSelfInfo.faceURL"
        :qr-content="qrContent"
        :hint="$t('qrCodeHint')"
        :id-label="$t('userID')"
        :id-value="userStore.storeSelfInfo.userID"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar/index.vue'
import OpenIMQrCodeCard from '@/components/OpenIMQrCodeCard/index.vue'
import useUserStore from '@/store/modules/user'
import { buildFriendQrCodeContent } from '@/constants/qrcode'

const userStore = useUserStore()

const qrContent = computed(() =>
  buildFriendQrCodeContent(userStore.storeSelfInfo.userID),
)
</script>

<style lang="scss" scoped></style>
