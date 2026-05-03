<template>
  <div class="header flex items-center px-[22px] py-4">
    <Avatar
      :size="48"
      :src="userStore.storeSelfInfo.faceURL"
      :desc="userStore.storeSelfInfo.nickname"
    />
    <div class="mx-3 flex-1 text-xs">
      <div class="flex items-center">
        <div class="max-w-[30vw] truncate text-base">
          {{ userStore.storeSelfInfo.nickname }}
        </div>
        <div v-if="!userStore.reinstall">
          <view
            class="ml-3 flex h-[22px] w-[76px] items-center justify-center rounded-md bg-[#F2F8FF]"
            v-if="userStore.isSyncing"
          >
            <img class="loading h-3 w-3" :src="loading" alt="" />
            <text class="ml-0.5 text-xs text-primary">{{ $t('syncing') }}</text>
          </view>
          <view
            class="ml-3 flex h-[22px] w-[76px] items-center justify-center rounded-md bg-[#F2F8FF]"
            v-if="connectState === connectStateEnum.Loading"
          >
            <img class="loading h-3 w-3" :src="loading" alt="" />
            <text class="ml-0.5 text-xs text-primary">{{ $t('connecting') }}</text>
          </view>
          <view
            class="ml-3 flex h-[22px] w-[76px] items-center justify-center rounded-md bg-[#FFE1DD]"
            v-if="connectState === connectStateEnum.Failed"
          >
            <img class="h-3 w-3" :src="sync_error" alt="" />
            <text class="ml-0.5 text-xs text-error-text">{{
              $t('connectFailed')
            }}</text>
          </view>
        </div>
      </div>
    </div>
    <div class="flex">
      <van-popover
        :show-arrow="false"
        v-model:show="showPopover"
        :actions="conversationTopMoreActions"
        placement="bottom-end"
        @select="selectMenu"
      >
        <template #reference>
          <img :src="add" alt="add" width="24" />
        </template>
      </van-popover>
    </div>
  </div>
</template>

<script setup lang="ts">
import Avatar from '@/components/Avatar/index.vue'
import add from '@/assets/images/conversation/add.png'
import loading from '@/assets/images/conversation/loading.png'
import sync_error from '@assets/images/conversation/sync_error.png'
import add_search_user from '@assets/images/contact/add_search_user.png'
import add_join_group from '@assets/images/contact/add_join_group.png'
import add_create_group from '@assets/images/contact/add_create_group.png'
import add_scan from '@assets/images/contact/add_scan.png'
import mass_msg from '@assets/images/contact/mass_msg.png'
import { PopoverAction } from 'vant'
import useUserStore from '@/store/modules/user'
import { IMSDK } from '@/utils/imCommon'
import { CbEvents, GroupType, SessionType } from '@openim/wasm-client-sdk'
import useAppConfigStore from '@/store/modules/appConfig'
import { feedbackToast } from '@/utils/common'
import useConversationToggle from '@/hooks/useConversationToggle'

enum ActionEnum {
  AddFriend,
  AddGroup,
  CreateGroup,
  ScanCode,
  BroadcastMessage,
  MessageToSelf,
}

enum connectStateEnum {
  Loading,
  Success,
  Failed,
}

type ConversationPopoverAction = PopoverAction & {
  actionType: ActionEnum
}

const { t } = useI18n()

const userStore = useUserStore()
const appConfigStore = useAppConfigStore()
const router = useRouter()
const { toSpecifiedConversation } = useConversationToggle()

const showPopover = ref(false)
const connectState = ref(connectStateEnum.Success)

const userType = computed(() => Number((userStore.storeSelfInfo as any).userType ?? 1))
const friendsSwitch = computed(() => !!appConfigStore.storeAppConfig?.friends_switch)
const groupsSwitch = computed(() => !!appConfigStore.storeAppConfig?.groups_switch)
const canCreateGroup = computed(() => userType.value !== 0)
const canAddFriend = computed(() => canCreateGroup.value || friendsSwitch.value)
const canAddGroup = computed(() => canCreateGroup.value || groupsSwitch.value)

const conversationTopMoreActions = computed<ConversationPopoverAction[]>(() => {
  const actions: ConversationPopoverAction[] = []

  if (canAddFriend.value) {
    actions.push({
      text: t('addFriend'),
      icon: add_search_user,
      actionType: ActionEnum.AddFriend,
    })
  }

  if (canAddGroup.value) {
    actions.push({
      text: t('addGroupChat'),
      icon: add_join_group,
      actionType: ActionEnum.AddGroup,
    })
  }

  if (canCreateGroup.value) {
    actions.push({
      text: t('createGroup'),
      icon: add_create_group,
      actionType: ActionEnum.CreateGroup,
    })
  }

  actions.push(
    {
      text: t('scanQr'),
      icon: add_scan,
      actionType: ActionEnum.ScanCode,
    },
    {
      text: t('broadcastMessage'),
      icon: mass_msg,
      actionType: ActionEnum.BroadcastMessage,
    },
    {
      text: t('messageToSelf'),
      icon: add_search_user,
      actionType: ActionEnum.MessageToSelf,
    },
  )

  return actions
})

const setConnectLoading = () => (connectState.value = connectStateEnum.Loading)
const setConnectSuccess = () => (connectState.value = connectStateEnum.Success)
const setConnectFailed = () => (connectState.value = connectStateEnum.Failed)

onMounted(() => {
  IMSDK.on(CbEvents.OnConnecting, setConnectLoading)
  IMSDK.on(CbEvents.OnConnectSuccess, setConnectSuccess)
  IMSDK.on(CbEvents.OnConnectFailed, setConnectFailed)
})

onBeforeUnmount(() => {
  IMSDK.off(CbEvents.OnConnecting, setConnectLoading)
  IMSDK.off(CbEvents.OnConnectSuccess, setConnectSuccess)
  IMSDK.off(CbEvents.OnConnectFailed, setConnectFailed)
})

const selectMenu = async (action: ConversationPopoverAction) => {
  switch (action.actionType) {
    case ActionEnum.AddFriend:
    case ActionEnum.AddGroup:
      router.push({
        path: 'searchToJoin',
        query: {
          isGroup: String(action.actionType === ActionEnum.AddGroup),
        },
      })
      break
    case ActionEnum.CreateGroup:
      router.push({
        path: 'createGroup',
        query: {
          groupType: GroupType.WorkingGroup,
        },
      })
      break
    case ActionEnum.ScanCode:
    case ActionEnum.BroadcastMessage:
      feedbackToast({ message: t('messageTip.featureNotSupportedOnH5'), error: true })
      break
    case ActionEnum.MessageToSelf:
      if (!userStore.storeSelfInfo.userID) {
        feedbackToast({ message: t('messageTip.getUserInfoFailed'), error: true })
        return
      }
      await toSpecifiedConversation({
        sourceID: userStore.storeSelfInfo.userID,
        sessionType: SessionType.Single,
      })
      break
    default:
      break
  }
}
</script>

<style lang="scss" scoped>
@keyframes loading {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.loading {
  animation: loading 1.5s infinite;
}
</style>
