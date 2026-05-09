<template>
  <div class="header px-[22px] py-4">
    <div class="flex items-center">
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
      <div class="flex items-center gap-4">
        <button
          v-if="hasLineSwitch"
          type="button"
          class="header_action_btn"
          @click="showLinePopup = true"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 14a8 8 0 1 1 16 0"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
            <path
              d="M12 14l4-4"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
            <circle cx="12" cy="14" r="1.4" fill="currentColor" />
          </svg>
        </button>

        <button
          type="button"
          class="header_action_btn"
          @click="router.push('/globalSearch')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle
              cx="11"
              cy="11"
              r="6.5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
            <path
              d="M16 16l4 4"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
        </button>

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

    <van-popup
      v-model:show="showLinePopup"
      round
      position="bottom"
      class="line_popup"
      @open="startLineSpeedDetection"
    >
      <div class="px-5 pb-6 pt-5">
        <div class="flex items-center justify-between">
          <div class="text-[18px] font-semibold text-[#0C1C33]">
            {{ $t('lineSwitchTitle') }}
          </div>
          <van-icon
            name="cross"
            size="22"
            color="#8E9AB0"
            @click="showLinePopup = false"
          />
        </div>
        <div class="mt-3 text-sm text-sub-text">{{ $t('lineSwitchDesc') }}</div>
        <div class="mt-2 text-sm text-[#FF381F]">
          {{ $t('lineSwitchReloginTip') }}
        </div>

        <div class="mt-4 overflow-hidden rounded-[14px] bg-[#F8F9FA]">
          <div
            v-for="(host, index) in availableHosts"
            :key="host"
            class="line_row"
            :class="{ 'line_row--active': host === currentLineHost }"
            @click="switchLine(host, index)"
          >
            <div class="flex items-center">
              <span class="text-[18px] font-medium text-[#0C1C33]">
                {{ getLineLabel(index) }}
              </span>
              <span
                v-if="host === currentLineHost"
                class="ml-2 text-xs font-medium text-primary"
              >
                {{ $t('lineCurrent') }}
              </span>
            </div>

            <div class="line_speed_tag">
              <van-loading
                v-if="lineSpeedResults[host] === null"
                size="12"
                color="#0089FF"
              />
              <span
                class="ml-1"
                :class="{
                  'text-[#FF381F]': (lineSpeedResults[host] ?? 0) >= 999999,
                  'text-[#8E9AB0]': lineSpeedResults[host] !== null,
                }"
              >
                {{ getLineSpeedStatus(host) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </van-popup>
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
import mass_msg from '@assets/images/contact/mass_msg.png'
import scan from '@assets/images/conversation/scan.png'
import qr_code from '@assets/images/profile/qr_code.png'
import { PopoverAction, showToast } from 'vant'
import useUserStore from '@/store/modules/user'
import { IMSDK } from '@/utils/imCommon'
import { CbEvents, GroupType, SessionType } from '@openim/wasm-client-sdk'
import useAppConfigStore from '@/store/modules/appConfig'
import useConversationToggle from '@/hooks/useConversationToggle'
import { applyLineHost, getAvailableHosts, getCurrentLineHost, testHostLatency } from '@/utils/lineSwitch'

enum ActionEnum {
  AddFriend,
  AddGroup,
  CreateGroup,
  ScanQrCode,
  MyQrCode,
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
const showLinePopup = ref(false)
const connectState = ref(connectStateEnum.Success)
const lineSpeedResults = ref<Record<string, number | null>>({})
let lineDetectTaskId = 0

const userType = computed(() => Number((userStore.storeSelfInfo as any).userType ?? 1))
const friendsSwitch = computed(() => !!appConfigStore.storeAppConfig?.friends_switch)
const groupsSwitch = computed(() => !!appConfigStore.storeAppConfig?.groups_switch)
const canCreateGroup = computed(() => userType.value !== 0)
const canAddFriend = computed(() => canCreateGroup.value || friendsSwitch.value)
const canAddGroup = computed(() => canCreateGroup.value || groupsSwitch.value)
const availableHosts = computed(() => getAvailableHosts())
const hasLineSwitch = computed(() => availableHosts.value.length > 0)
const currentLineHost = computed(() => getCurrentLineHost())

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
      text: t('scanQrCode'),
      icon: scan,
      actionType: ActionEnum.ScanQrCode,
    },
    {
      text: t('qrCode'),
      icon: qr_code,
      actionType: ActionEnum.MyQrCode,
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
  lineDetectTaskId += 1
})

const getLineLabel = (index: number) => t('lineLabel', { index: index + 1 })

const getLineSpeedStatus = (host: string) => {
  const speed = lineSpeedResults.value[host]
  if (speed === null || speed === undefined) {
    return t('lineChecking')
  }
  if (speed >= 999999) {
    return t('lineUnavailable')
  }
  return `${speed}ms`
}

const startLineSpeedDetection = async () => {
  if (!availableHosts.value.length) return

  const taskId = ++lineDetectTaskId
  lineSpeedResults.value = Object.fromEntries(
    availableHosts.value.map((host) => [host, null]),
  )

  for (const host of availableHosts.value) {
    const speed = await testHostLatency(host)
    if (taskId !== lineDetectTaskId) {
      return
    }
    lineSpeedResults.value = {
      ...lineSpeedResults.value,
      [host]: speed,
    }
  }
}

const switchLine = async (host: string, index: number) => {
  if (host === currentLineHost.value) {
    showLinePopup.value = false
    return
  }

  try {
    await userStore.userLogout()
  } catch (error) {
    await userStore.userLogout(true)
  }

  applyLineHost(host)
  showLinePopup.value = false
  await router.replace('/login')
  showToast({
    type: 'success',
    message: t('messageTip.lineSwitchedRelogin', {
      line: getLineLabel(index),
    }),
  })
}

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
    case ActionEnum.ScanQrCode:
      router.push('/scanQrCode')
      break
    case ActionEnum.MyQrCode:
      router.push('/myQrCode')
      break
    case ActionEnum.BroadcastMessage:
      router.push('/broadcastMessage')
      break
    case ActionEnum.MessageToSelf:
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

.header_action_btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #0c1c33;
}

.header_action_btn svg {
  width: 24px;
  height: 24px;
}

.line_popup {
  background: #fff;
}

.line_row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  margin: 0 14px;
  border-left: 3px solid transparent;
}

.line_row + .line_row {
  border-top: 1px solid #e8eaef;
}

.line_row--active {
  padding-left: 10px;
  margin-left: 0;
  background: rgba(0, 137, 255, 0.06);
  border-left-color: #0089ff;
}

.line_speed_tag {
  display: inline-flex;
  align-items: center;
  min-width: 82px;
  justify-content: center;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(0, 137, 255, 0.1);
  font-size: 12px;
}
</style>
