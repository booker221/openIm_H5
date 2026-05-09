<template>
  <div class="page_container bg-[#F8F9FA]">
    <NavBar :title="$t('groupQrCode')" />
    <div class="flex-1 overflow-y-auto pb-6">
      <OpenIMQrCodeCard
        :title="conversationStore.storeCurrentGroupInfo.groupName"
        :avatar="conversationStore.storeCurrentGroupInfo.faceURL"
        :qr-content="qrContent"
        :hint="$t('groupQrCodeHint')"
        :id-label="$t('groupID')"
        :id-value="conversationStore.storeCurrentGroupInfo.groupID"
        is-group
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar/index.vue'
import OpenIMQrCodeCard from '@/components/OpenIMQrCodeCard/index.vue'
import useConversationStore from '@/store/modules/conversation'
import { buildGroupQrCodeContent } from '@/constants/qrcode'

const conversationStore = useConversationStore()

const qrContent = computed(() =>
  buildGroupQrCodeContent(conversationStore.storeCurrentGroupInfo.groupID),
)
</script>

<style lang="scss" scoped></style>
