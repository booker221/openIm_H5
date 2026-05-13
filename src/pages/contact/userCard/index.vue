<template>
  <div class="page_container !overflow-y-auto">
    <NavBar>
      <img
        v-if="showFriendSettingMore"
        class="h-[23px] min-w-[23px]"
        :src="more"
        alt="more"
        @click="toFriendSetting"
      />
    </NavBar>
    <div class="flex-1">
      <div class="mb-2 flex items-center bg-white px-[22px] py-6">
        <Avatar
          :size="48"
          :src="contactStore.storeUserCardData.baseInfo?.faceURL"
          :desc="contactStore.storeUserCardData.baseInfo?.nickname"
          @click="avatarPreview"
        />
        <div class="ml-3 flex flex-1 flex-row items-center justify-between">
          <div class="flex flex-col items-start justify-between">
            <span class="mr-2 max-w-[160px] truncate font-medium">
              {{ contactStore.storeUserCardData.baseInfo?.nickname }}
              {{
                contactStore.storeUserCardData.baseInfo?.remark
                  ? '(' + contactStore.storeUserCardData.baseInfo?.remark + ')'
                  : ''
              }}
            </span>
            <span
              class="mr-2 max-w-[160px] truncate text-sm font-medium text-sub-text"
              @click="copy2Text(contactStore.storeUserCardData.baseInfo?.userID || '')"
            >
              {{ contactStore.storeUserCardData.baseInfo?.userID }}
            </span>
          </div>
          <div
            v-if="canAddFriend"
            class="ml-auto flex h-[30px] flex-row items-center justify-center rounded-md bg-primary px-2 py-1"
            @click="toAddFriend"
          >
            <img width="20" :src="add" alt="" />
            <span class="text-sm text-white">{{ $t('add') }}</span>
          </div>
        </div>
      </div>

      <!-- about group -->
      <div class="mb-2" v-if="contactStore.storeUserCardData.groupMemberInfo">
        <CardDescItem :lable="$t('joinGroupTime')" :content="comptJoinTime" />
      </div>

      <CardDescItem
        v-if="showUserInfoEntry"
        class="mb-2"
        :lable="$t('userInfo')"
        arrow
        @click="toUserCardDetails"
      />

      <div v-if="showMessageAction" class="mx-2 mb-2 overflow-hidden rounded-md bg-white">
        <button
          class="flex w-full items-center justify-center gap-3 bg-white px-4 py-4 text-[17px] text-[#0C1C33] active:bg-[#F5F6F7]"
          @click="toConversation"
        >
          <van-icon name="chat-o" size="22" />
          <span>{{ $t('sendMessage') }}</span>
        </button>
        <button
          v-if="showFriendActionBar"
          class="flex w-full items-center justify-center gap-3 border-t border-[#E8EAEF] bg-white px-4 py-4 text-[17px] text-[#0C1C33] active:bg-[#F5F6F7]"
          @click="toCall"
        >
          <van-icon name="phone-o" size="22" />
          <span>{{ $t('audioVideoCall') }}</span>
        </button>
      </div>
    </div>

    <van-action-sheet
      v-model:show="callActionVisible"
      teleport="body"
      :actions="callActions"
      :cancel-text="$t('buttons.cancel')"
      @select="onCallActionSelect"
    />
  </div>
</template>

<script setup lang="ts">
import add from '@assets/images/userCard/add.png'
import more from '@assets/images/chatHeader/more.png'

import NavBar from '@/components/NavBar/index.vue'
import Avatar from '@/components/Avatar/index.vue'
import CardDescItem from '@/components/CardDescItem/index.vue'
import { feedbackToast, copy2Text } from '@/utils/common'
import useContactStore from '@/store/modules/contact'
import { SessionType } from '@openim/wasm-client-sdk'
import dayjs from 'dayjs'
import useUserStore from '@/store/modules/user'
import useAppConfigStore from '@/store/modules/appConfig'
import { BusinessAllowType } from '@/api/data'
import useConversationToggle from '@/hooks/useConversationToggle'
import { useInviteRtc } from '@/hooks/useInviteRtc'
import { showImagePreview, type ActionSheetAction } from 'vant'
import { ChatFooterActionType } from '@/constants/action'
import type { ParticipantInfo } from '@/pages/rtc/data'

const { toSpecifiedConversation } = useConversationToggle()
const contactStore = useContactStore()
const userStore = useUserStore()
const appConfigStore = useAppConfigStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { inviteRtc } = useInviteRtc()

type CallAction = ActionSheetAction & {
  type: ChatFooterActionType.VoiceCall | ChatFooterActionType.VideoCall
}

const isSelf = computed(
  () => contactStore.storeUserCardData.baseInfo?.userID === userStore.selfInfo.userID,
)
const friendInfo = computed(() => contactStore.storeUserCardData.friendInfo)
const isFriendUser = computed(() => !!friendInfo.value)
const userType = computed(() => Number((userStore.storeSelfInfo as any).userType ?? 1))
const friendsSwitch = computed(() => !!appConfigStore.storeAppConfig?.friends_switch)

// group
const comptJoinTime = computed(() =>
  contactStore.storeUserCardData.groupMemberInfo
    ? dayjs(contactStore.storeUserCardData.groupMemberInfo.joinTime).format(
        'YYYY-MM-DD',
      )
    : '',
)

const canAddFriend = computed(
  () =>
    !isSelf.value &&
    !isFriendUser.value &&
    contactStore.storeUserCardData.baseInfo?.allowAddFriend !==
      BusinessAllowType.NotAllow &&
    (userType.value !== 0 || friendsSwitch.value),
)
const showFriendSettingMore = computed(() => !isSelf.value && isFriendUser.value)
const showFriendActionBar = computed(() => !isSelf.value && isFriendUser.value)
const showMessageAction = computed(() => isSelf.value || isFriendUser.value)
const showUserInfoEntry = computed(
  () =>
    isSelf.value ||
    isFriendUser.value ||
    !!contactStore.storeUserCardData.groupMemberInfo,
)
const routeSourceID = computed(() =>
  typeof route.query.sourceID === 'string' ? route.query.sourceID : '',
)
const routeGroupID = computed(() =>
  typeof route.query.groupID === 'string' ? route.query.groupID : '',
)
const currentRouteQuery = computed(() => {
  const sourceID = routeSourceID.value || contactStore.storeUserCardData.baseInfo?.userID

  if (!sourceID) {
    return {}
  }

  const groupID =
    routeGroupID.value || contactStore.storeUserCardData.groupMemberInfo?.groupID

  return {
    sourceID,
    ...(groupID ? { groupID } : {}),
  }
})
const callActionVisible = ref(false)
const callActions = computed<CallAction[]>(() => [
  {
    name: t('rtc.video'),
    type: ChatFooterActionType.VideoCall,
  },
  {
    name: t('rtc.voice'),
    type: ChatFooterActionType.VoiceCall,
  },
])

// events
const toConversation = () => {
  toSpecifiedConversation({
    sourceID: contactStore.storeUserCardData.baseInfo?.userID!,
    sessionType: SessionType.Single,
  })
}

const toCall = () => {
  callActionVisible.value = true
}

const getCallParticipant = (): ParticipantInfo | undefined => {
  const baseInfo = contactStore.storeUserCardData.baseInfo

  if (!baseInfo?.userID) {
    return undefined
  }

  return {
    userInfo: {
      nickname: baseInfo.nickname || '',
      userID: baseInfo.userID,
      faceURL: baseInfo.faceURL || '',
      ex: '',
    },
  }
}

const onCallActionSelect = ({ type }: CallAction) => {
  callActionVisible.value = false

  const participant = getCallParticipant()
  if (!participant) {
    return
  }

  inviteRtc(type, [participant.userInfo.userID], {
    participant,
  })
}

const toFriendSetting = () => {
  router.push({
    path: '/userCardSetting',
    query: currentRouteQuery.value,
  })
}

const toUserCardDetails = () => {
  router.push({
    path: '/userCardDetails',
    query: currentRouteQuery.value,
  })
}

const toAddFriend = () => {
  if (
    contactStore.storeUserCardData.baseInfo?.allowAddFriend ===
    BusinessAllowType.NotAllow
  ) {
    feedbackToast({
      message: t('notCanAddFriend'),
      error: t('notCanAddFriend'),
    })
    return
  }
  router.push({
    path: 'sendApplication',
    query: {
      sourceID: contactStore.storeUserCardData.baseInfo?.userID,
      sessionType: SessionType.Single,
    },
  })
}

const avatarPreview = () => {
  if (contactStore.storeUserCardData.baseInfo?.faceURL?.includes('http')) {
    return showImagePreview({
      images: [contactStore.storeUserCardData.baseInfo?.faceURL],
      loop: false,
    })
  }
}

const ensureUserCardData = async () => {
  const sourceID = routeSourceID.value || contactStore.storeUserCardData.baseInfo?.userID
  const groupID = routeGroupID.value || contactStore.storeUserCardData.groupMemberInfo?.groupID

  if (!sourceID) {
    router.replace('/conversation')
    return
  }

  const needHydrate =
    contactStore.storeUserCardData.baseInfo?.userID !== sourceID ||
    (groupID || contactStore.storeUserCardData.groupMemberInfo?.groupID
      ? contactStore.storeUserCardData.groupMemberInfo?.groupID !== groupID
      : false)

  if (!needHydrate) {
    return
  }

  const restored = await contactStore.hydrateUserCardData(sourceID, groupID)
  if (!restored) {
    router.replace('/conversation')
  }
}

onMounted(() => {
  ensureUserCardData()
})
</script>

<style lang="scss" scoped></style>
