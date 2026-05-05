<template>
  <div class="flex h-full flex-col">
    <div class="flex-1 overflow-hidden">
      <router-view v-slot="{ Component }">
        <transition>
          <keep-alive include="profile,contact,conversation,meeting">
            <component :is="Component" />
          </keep-alive>
        </transition>
      </router-view>
    </div>
    <tabbar></tabbar>
    <van-overlay :show="showProgress" z-index="100">
      <div class="flex h-full w-full items-center justify-center">
        <van-loading size="24px" vertical>{{ `${userStore.progress}%` }}</van-loading>
      </div>
    </van-overlay>
  </div>
</template>

<script setup lang="ts" name="tabbar">
import Tabbar from './Tabbar.vue'
import useConversationStore from '@/store/modules/conversation'
import { AllowType } from '@openim/wasm-client-sdk'
import useContactStore from '@/store/modules/contact'
import { useGlobalEvent } from './useGlobalEvent'
import { getIMToken, getIMUserID } from '@/utils/storage'
import { initStore } from '@/utils/imCommon'
import { ensureIMLogin } from '@/utils/imLogin'
import useUserStore from '@/store/modules/user'

useGlobalEvent()
const userStore = useUserStore()
const router = useRouter()
const hasInitializedStore = ref(false)

const showProgress = computed(
  () => userStore.reinstall && userStore.progress > 0 && userStore.progress < 100,
)

onMounted(() => {
  bootstrapIM()
})

const bootstrapIM = async () => {
  const IMToken = getIMToken()
  const IMUserID = getIMUserID()
  if (!IMToken || !IMUserID) {
    router.replace('/login')
    return
  }

  const isLogged = await ensureIMLogin()
  if (!isLogged) {
    router.replace('/login')
    return
  }

  if (!hasInitializedStore.value) {
    initStore()
    hasInitializedStore.value = true
  }
}

window.userClick = (userID?: string, groupID?: string) => {
  const conversationStore = useConversationStore()
  const contactStore = useContactStore()
  if (!userID || userID === 'AtAllTag') return

  const currentGroupInfo = conversationStore.currentGroupInfo

  if (groupID && currentGroupInfo?.lookMemberInfo === AllowType.NotAllowed) {
    return
  }

  contactStore.getUserCardData(userID, groupID)
}

window.reEdit = (clientMsgID: string) => {
}
</script>

<style lang="scss" scoped></style>
