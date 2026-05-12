<template>
  <div class="page_container">
    <NavBar :title="$t('friendSettings')" />

    <div class="my-2 mx-2 overflow-hidden rounded-md">
      <CardDescItem
        :lable="$t('setNickname')"
        arrow
        @click="toChangeName"
        v-if="isFriendUser"
      />
      <CardDescItem
        v-if="isFriendUser"
        :lable="$t('shareFriend')"
        arrow
        @click="toShareFriend"
      />
    </div>

    <div
      v-if="isFriendUser"
      class="mx-2 mb-2 overflow-hidden rounded-md bg-white"
    >
      <SettingRowItem
        :title="$t('pinConversation')"
        :checked="isConversationPinned"
        :loading="pinLoading"
        show-switch
        border
        @updateValue="toggleConversationPin"
      />
      <SettingRowItem
        :title="$t('checks.notDisturb')"
        :checked="isNotDisturb"
        :loading="recvMsgOptLoading"
        show-switch
        @updateValue="toggleConversationRecvMsgOpt"
      />
    </div>

    <div
      v-if="isFriendUser"
      class="mx-2 mb-2 overflow-hidden rounded-md bg-white"
    >
      <SettingRowItem
        :title="$t('clearChatHistory')"
        border
        @click-item="tryClearChatHistory"
      />
      <SettingRowItem
        danger
        :title="$t('deleteConversation')"
        @click-item="tryDeleteConversation"
      />
    </div>

    <div class="mx-2 mb-2 overflow-hidden rounded-md">
      <CardDescItem :lable="$t('checks.addToBlack')" arrow>
        <van-switch
          size="20"
          :loading="toggleBlackLoading"
          :model-value="comptIsBlack"
          @update:model-value="toggleBlack"
        />
      </CardDescItem>
    </div>

    <div v-if="isFriendUser" class="mx-2 rounded-md">
      <van-button
        class="w-full !border-0 !text-base !text-error-text"
        plain
        type="default"
        :text="$t('unfriend')"
        @click="tryRemoveFriend"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar/index.vue'
import CardDescItem from '@/components/CardDescItem/index.vue'
import SettingRowItem from '@/components/SettingRowItem/index.vue'
import useContactStore from '@/store/modules/contact'
import useConversationStore from '@/store/modules/conversation'
import useMessageStore from '@/store/modules/message'
import useUserStore from '@/store/modules/user'
import { conversationSort, IMSDK } from '@/utils/imCommon'
import { feedbackToast } from '@/utils/common'
import { clearCurrentConversation } from '@/utils/storage'
import { showConfirmDialog } from 'vant'
import { ContactChooseEnum } from '../chooseUser/data'
import { MessageReceiveOptType, SessionType } from '@openim/wasm-client-sdk'
import type { ConversationItem } from '@openim/wasm-client-sdk/lib/types/entity'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const contactStore = useContactStore()
const conversationStore = useConversationStore()
const messageStore = useMessageStore()
const userStore = useUserStore()

const isFriendUser = computed(() => !!contactStore.storeUserCardData.friendInfo)
const routeSourceID = computed(() =>
  typeof route.query.sourceID === 'string' ? route.query.sourceID : '',
)
const routeGroupID = computed(() =>
  typeof route.query.groupID === 'string' ? route.query.groupID : '',
)
const targetUserID = computed(() => {
  return routeSourceID.value || contactStore.storeUserCardData.baseInfo?.userID || ''
})
const friendConversation = ref<ConversationItem>()
const pinLoading = ref(false)
const recvMsgOptLoading = ref(false)
const clearChatLoading = ref(false)
const deleteConversationLoading = ref(false)

const isConversationPinned = computed(() => !!friendConversation.value?.isPinned)
const isNotDisturb = computed(
  () => friendConversation.value?.recvMsgOpt === MessageReceiveOptType.NotNotify,
)
const isCurrentFriendConversation = computed(
  () =>
    conversationStore.storeCurrentConversation.conversationType === SessionType.Single &&
    conversationStore.storeCurrentConversation.userID === targetUserID.value,
)

const comptIsBlack = computed(
  () =>
    contactStore.storeBlackList.findIndex(
      (user) => user.userID === contactStore.storeUserCardData.baseInfo?.userID,
    ) > -1,
)
const toggleBlackLoading = ref(false)
const toggleBlack = async (newValue: boolean) => {
  if (toggleBlackLoading.value || newValue === comptIsBlack.value) {
    return
  }

  const baseInfo = contactStore.storeUserCardData.baseInfo
  if (!baseInfo?.userID) {
    return
  }

  toggleBlackLoading.value = true
  contactStore.setBlackUserState(baseInfo, newValue)

  try {
    if (newValue) {
      await IMSDK.addBlack({
        toUserID: baseInfo.userID,
        ex: '',
      })
      feedbackToast({ message: t('addBlackSuccess') })
      return
    }

    await IMSDK.removeBlack(baseInfo.userID)
    feedbackToast({ message: t('removeBlackSuccess') })
  } catch (error) {
    contactStore.setBlackUserState(baseInfo, !newValue)
    feedbackToast({ error })
  } finally {
    toggleBlackLoading.value = false
  }
}

const applyConversationToStore = (conversation: ConversationItem) => {
  friendConversation.value = conversation

  const nextConversationList = conversationSort([
    conversation,
    ...conversationStore.storeConversationList.filter(
      (item) => item.conversationID !== conversation.conversationID,
    ),
  ])
  conversationStore.updateConversationList(nextConversationList)

  if (
    isCurrentFriendConversation.value ||
    conversationStore.storeCurrentConversation.conversationID ===
      conversation.conversationID
  ) {
    conversationStore.updateCurrentConversation(conversation)
  }
}

const removeConversationFromStore = (conversationID: string) => {
  conversationStore.updateConversationList(
    conversationStore.storeConversationList.filter(
      (item) => item.conversationID !== conversationID,
    ),
  )

  if (
    conversationStore.storeCurrentConversation.conversationID === conversationID
  ) {
    conversationStore.resetCurrentConversation()
    clearCurrentConversation()
  }
}

const getConversationFromStore = () =>
  conversationStore.storeConversationList.find(
    (item) =>
      item.conversationType === SessionType.Single && item.userID === targetUserID.value,
  )

const ensureFriendConversation = async () => {
  if (friendConversation.value?.conversationID) {
    return friendConversation.value
  }

  const localConversation = getConversationFromStore()
  if (localConversation?.conversationID) {
    friendConversation.value = localConversation
    return localConversation
  }

  if (!targetUserID.value) {
    return undefined
  }

  try {
    const { data } = await IMSDK.getOneConversation({
      sourceID: targetUserID.value,
      sessionType: SessionType.Single,
    })
    if (data?.conversationID) {
      friendConversation.value = data
      return data
    }
  } catch (error) {
    console.error(error)
  }

  return undefined
}

const syncConversationRecvMsgOpt = async (checked: boolean) => {
  if (recvMsgOptLoading.value) return

  recvMsgOptLoading.value = true
  try {
    const conversation = await ensureFriendConversation()
    if (!conversation?.conversationID) {
      throw new Error('Conversation not found')
    }

    const recvMsgOpt = checked
      ? MessageReceiveOptType.NotNotify
      : MessageReceiveOptType.Normal

    await IMSDK.setConversation({
      conversationID: conversation.conversationID,
      recvMsgOpt,
    })

    if (checked && conversation.unreadCount > 0) {
      await IMSDK.markConversationMessageAsRead(conversation.conversationID).catch(
        () => undefined,
      )
    }

    applyConversationToStore({
      ...conversation,
      recvMsgOpt,
      unreadCount: checked ? 0 : conversation.unreadCount,
    })
    conversationStore.getUnReadCountFromReq().catch(() => undefined)

    feedbackToast({
      message: checked
        ? t('setDoNotDisturbSuccess')
        : t('cancelDoNotDisturbSuccess'),
    })
  } catch (error) {
    feedbackToast({
      message: t('setConversationRecvMessageOptFailed'),
      error,
    })
  } finally {
    recvMsgOptLoading.value = false
  }
}

const toggleConversationRecvMsgOpt = (checked: boolean) => {
  syncConversationRecvMsgOpt(checked)
}

const toggleConversationPin = async (checked: boolean) => {
  if (pinLoading.value) return

  pinLoading.value = true
  try {
    const conversation = await ensureFriendConversation()
    if (!conversation?.conversationID) {
      throw new Error('Conversation not found')
    }

    await IMSDK.setConversation({
      conversationID: conversation.conversationID,
      isPinned: checked,
    })

    applyConversationToStore({
      ...conversation,
      isPinned: checked,
    })

    feedbackToast({
      message: checked ? t('pinConversationSuccess') : t('unpinConversationSuccess'),
    })
  } catch (error) {
    feedbackToast({
      message: t('pinConversationFailed'),
      error,
    })
  } finally {
    pinLoading.value = false
  }
}

const toChangeName = () => {
  router.push({
    path: '/changeNameOrRemark',
    query: {
      friendInfo: JSON.stringify(contactStore.storeUserCardData.friendInfo),
    },
  })
}

const toShareFriend = () => {
  const userInfo = contactStore.storeUserCardData.baseInfo
  if (!userInfo?.userID) return

  router.push({
    path: '/chooseUser',
    state: {
      chooseType: ContactChooseEnum.ShareCard,
      extraData: JSON.stringify({
        userID: userInfo.userID,
        nickname: userInfo.nickname,
        faceURL: userInfo.faceURL,
      }),
    },
  })
}

const tryClearChatHistory = () => {
  if (clearChatLoading.value) return

  showConfirmDialog({
    title: t('popover.clearModalTitle'),
    message: t('popover.clearChatHistory'),
    beforeClose: (action) =>
      new Promise((resolve) => {
        if (action !== 'confirm') {
          resolve(true)
          return
        }

        clearChatLoading.value = true
        ensureFriendConversation()
          .then(async (conversation) => {
            if (!conversation?.conversationID) {
              feedbackToast({
                message: t('clearChatHistorySuccess'),
              })
              return
            }

            await IMSDK.clearConversationAndDeleteAllMsg(conversation.conversationID)

            applyConversationToStore({
              ...conversation,
              latestMsg: '',
              latestMsgSendTime: 0,
              unreadCount: 0,
            })

            if (isCurrentFriendConversation.value) {
              messageStore.resetHistoryMessageList()
            }

            conversationStore.getUnReadCountFromReq().catch(() => undefined)
            feedbackToast({
              message: t('clearChatHistorySuccess'),
            })
          })
          .catch((error) =>
            feedbackToast({
              message: t('clearConversationMessagesFailed'),
              error,
            }),
          )
          .finally(() => {
            clearChatLoading.value = false
            resolve(true)
          })
      }),
  })
}

const tryDeleteConversation = () => {
  if (deleteConversationLoading.value) return

  showConfirmDialog({
    title: t('deleteConversation'),
    message: t('confirmDeleteConversation'),
    beforeClose: (action) =>
      new Promise((resolve) => {
        if (action !== 'confirm') {
          resolve(true)
          return
        }

        deleteConversationLoading.value = true
        ensureFriendConversation()
          .then(async (conversation) => {
            const deletingCurrentConversation = isCurrentFriendConversation.value
            if (!conversation?.conversationID) {
              feedbackToast({
                message: t('deleteConversationSuccess'),
              })
              return
            }

            await IMSDK.deleteConversationAndDeleteAllMsg(conversation.conversationID)
            removeConversationFromStore(conversation.conversationID)
            friendConversation.value = undefined
            if (deletingCurrentConversation) {
              messageStore.resetHistoryMessageList()
            }
            conversationStore.getUnReadCountFromReq().catch(() => undefined)

            feedbackToast({
              message: t('deleteConversationSuccess'),
            })

            if (deletingCurrentConversation) {
              router.replace('/conversation')
              return
            }

            router.back()
          })
          .catch((error) =>
            feedbackToast({
              message: t('deleteConversationFailed'),
              error,
            }),
          )
          .finally(() => {
            deleteConversationLoading.value = false
            resolve(true)
          })
      }),
  })
}

const tryRemoveFriend = () => {
  showConfirmDialog({
    message: t('messageTip.unfriend'),
    beforeClose: (action) =>
      new Promise((resolve) => {
        if (action === 'confirm') {
          const friendUserID = contactStore.storeUserCardData.baseInfo?.userID!
          const sortedUserIDs = [userStore.storeSelfInfo.userID, friendUserID].sort(
            (left, right) => (left > right ? 1 : -1),
          )
          const conversationID = `si_${sortedUserIDs.join('_')}`

          IMSDK.deleteFriend(friendUserID)
            .then(async () => {
              contactStore.updateUserCardFriendInfo(undefined)
              conversationStore.updateConversationList(
                conversationStore.storeConversationList.filter(
                  (item) => item.conversationID !== conversationID,
                ),
              )
              await IMSDK.deleteConversationAndDeleteAllMsg(conversationID).catch(
                () => undefined,
              )
              router.back()
            })
            .catch((error) => feedbackToast({ error }))
            .finally(() => resolve(true))
        } else {
          resolve(true)
        }
      }),
  })
}

onMounted(() => {
  const restoreUserCardData = async () => {
    const sourceID = routeSourceID.value || contactStore.storeUserCardData.baseInfo?.userID
    const groupID =
      routeGroupID.value || contactStore.storeUserCardData.groupMemberInfo?.groupID

    if (!sourceID) {
      router.replace('/conversation')
      return
    }

    const needHydrate =
      contactStore.storeUserCardData.baseInfo?.userID !== sourceID ||
      (groupID || contactStore.storeUserCardData.groupMemberInfo?.groupID
        ? contactStore.storeUserCardData.groupMemberInfo?.groupID !== groupID
        : false)

    if (needHydrate) {
      const restored = await contactStore.hydrateUserCardData(sourceID, groupID)
      if (!restored) {
        router.replace('/conversation')
        return
      }
    }

    if (!contactStore.storeUserCardData.friendInfo) {
      router.replace('/userCard')
      return
    }

    ensureFriendConversation()
  }

  restoreUserCardData()
})
</script>

<style lang="scss" scoped></style>
