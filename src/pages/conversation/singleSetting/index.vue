<template>
  <div class="page_container">
    <NavBar :title="$t('chatDetail')" />

    <div class="flex-1 overflow-y-auto">
      <div class="mt-[10px] bg-white py-5 pl-5">
        <div class="flex items-start gap-4">
          <button class="flex w-[56px] flex-col items-center text-center" @click="toUser">
            <Avatar
              :size="52"
              :src="conversation.faceURL"
              :desc="conversationDisplayName"
            />
            <span class="mt-2 w-full truncate text-[13px] leading-5 text-[#0C1C33]">
              {{ conversationDisplayName }}
            </span>
          </button>

          <button class="flex flex-col items-center text-center" @click="createGroup">
            <div
              class="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-dashed border-[#D8DCE3] bg-[#FCFCFD] text-[#9AA4B2]"
            >
              <van-icon name="plus" size="24" />
            </div>
          </button>
        </div>
      </div>

      <div class="mt-[10px] bg-white">
        <button class="setting-row" @click="toChatHistory">
          <span class="setting-row__title">{{ $t('searchChatContent') }}</span>
          <img class="setting-row__arrow" :src="back" alt="" />
        </button>
      </div>

      <div class="mt-[10px] bg-white">
        <div class="setting-row">
          <span class="setting-row__title">{{ $t('checks.notDisturb') }}</span>
          <van-switch
            size="24px"
            :model-value="isNotDisturb"
            :loading="recvMsgOptLoading"
            active-color="var(--primary)"
            inactive-color="#E5E5EA"
            @update:model-value="toggleConversationRecvMsgOpt"
          />
        </div>
        <div class="ml-5 h-px bg-[#EDEDED]"></div>
        <div class="setting-row">
          <span class="setting-row__title">{{ $t('pinConversation') }}</span>
          <van-switch
            size="24px"
            :model-value="isPinned"
            :loading="pinLoading"
            active-color="var(--primary)"
            inactive-color="#E5E5EA"
            @update:model-value="toggleConversationPin"
          />
        </div>
      </div>

      <div class="mt-[10px] bg-white">
        <button class="setting-row" @click="tryClearChatHistory">
          <span class="setting-row__title">{{ $t('clearChatHistory') }}</span>
          <img class="setting-row__arrow" :src="back" alt="" />
        </button>
      </div>

      <div class="mt-[10px] mb-4 bg-white">
        <button class="setting-row" @click="tryDeleteConversation">
          <span class="setting-row__title text-error-text">
            {{ $t('deleteConversation') }}
          </span>
          <img class="setting-row__arrow" :src="back" alt="" />
        </button>
      </div>
    </div>
  </div>
</template>

<script name="singleSetting" setup lang="ts">
import back from '@assets/images/profile/back.png'
import NavBar from '@/components/NavBar/index.vue'
import Avatar from '@/components/Avatar/index.vue'
import useContactStore from '@/store/modules/contact'
import useConversationStore from '@/store/modules/conversation'
import useMessageStore from '@/store/modules/message'
import { feedbackToast } from '@/utils/common'
import { conversationSort, IMSDK } from '@/utils/imCommon'
import { clearCurrentConversation } from '@/utils/storage'
import { MessageReceiveOptType, SessionType } from '@openim/wasm-client-sdk'
import type { ConversationItem } from '@openim/wasm-client-sdk/lib/types/entity'
import { showConfirmDialog } from 'vant'

const router = useRouter()
const contactStore = useContactStore()
const conversationStore = useConversationStore()
const messageStore = useMessageStore()
const { t } = useI18n()

const pinLoading = ref(false)
const recvMsgOptLoading = ref(false)
const clearChatLoading = ref(false)
const deleteConversationLoading = ref(false)

const conversation = computed(() => conversationStore.storeCurrentConversation)
const conversationDisplayName = computed(
  () => conversation.value.showName || conversation.value.userID || '',
)
const isPinned = computed(() => !!conversation.value.isPinned)
const isNotDisturb = computed(
  () => conversation.value.recvMsgOpt === MessageReceiveOptType.NotNotify,
)

const applyConversationToStore = (nextConversation: ConversationItem) => {
  conversationStore.updateCurrentConversation(nextConversation)

  const nextConversationList = conversationSort([
    nextConversation,
    ...conversationStore.storeConversationList.filter(
      (item) => item.conversationID !== nextConversation.conversationID,
    ),
  ])
  conversationStore.updateConversationList(nextConversationList)
}

const removeConversationFromStore = (conversationID: string) => {
  conversationStore.updateConversationList(
    conversationStore.storeConversationList.filter(
      (item) => item.conversationID !== conversationID,
    ),
  )
  conversationStore.resetCurrentConversation()
  clearCurrentConversation()
}

const toUser = () => {
  if (!conversation.value.userID) {
    return
  }

  contactStore.getUserCardData(conversation.value.userID)
}

const createGroup = () => {
  if (!conversation.value.userID) {
    return
  }

  router.push({
    path: '/createGroup',
    state: {
      prevCheckedUserList: JSON.stringify([
        {
          ...conversation.value,
          nickname: conversationDisplayName.value,
        },
      ]),
    },
  })
}

const toChatHistory = () => {
  router.push('/chatHistory')
}

const toggleConversationRecvMsgOpt = async (checked: boolean) => {
  if (recvMsgOptLoading.value || !conversation.value.conversationID) return

  recvMsgOptLoading.value = true
  try {
    const recvMsgOpt = checked
      ? MessageReceiveOptType.NotNotify
      : MessageReceiveOptType.Normal

    await IMSDK.setConversation({
      conversationID: conversation.value.conversationID,
      recvMsgOpt,
    })

    if (checked && conversation.value.unreadCount > 0) {
      await IMSDK.markConversationMessageAsRead(
        conversation.value.conversationID,
      ).catch(() => undefined)
    }

    applyConversationToStore({
      ...conversation.value,
      recvMsgOpt,
      unreadCount: checked ? 0 : conversation.value.unreadCount,
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

const toggleConversationPin = async (checked: boolean) => {
  if (pinLoading.value || !conversation.value.conversationID) return

  pinLoading.value = true
  try {
    await IMSDK.setConversation({
      conversationID: conversation.value.conversationID,
      isPinned: checked,
    })

    applyConversationToStore({
      ...conversation.value,
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

const tryClearChatHistory = () => {
  if (clearChatLoading.value || !conversation.value.conversationID) return

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
        IMSDK.clearConversationAndDeleteAllMsg(conversation.value.conversationID)
          .then(() => {
            applyConversationToStore({
              ...conversation.value,
              latestMsg: '',
              latestMsgSendTime: 0,
              unreadCount: 0,
            })

            messageStore.resetHistoryMessageList()
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
  if (deleteConversationLoading.value || !conversation.value.conversationID) return

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
        IMSDK.deleteConversationAndDeleteAllMsg(conversation.value.conversationID)
          .then(() => {
            removeConversationFromStore(conversation.value.conversationID)
            messageStore.resetHistoryMessageList()
            conversationStore.getUnReadCountFromReq().catch(() => undefined)
            feedbackToast({
              message: t('deleteConversationSuccess'),
            })
            router.replace('/conversation')
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

onMounted(async () => {
  if (!conversation.value.conversationID) {
    const restored = await conversationStore.restoreCurrentConversation()
    if (!restored) {
      router.replace('/conversation')
      return
    }
  }

  if (conversationStore.storeCurrentConversation.conversationType !== SessionType.Single) {
    router.replace('/conversation')
  }
})
</script>

<style lang="scss" scoped>
.setting-row {
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 20px;
  background: #fff;
}

.setting-row__title {
  font-size: 17px;
  line-height: 24px;
  color: #0c1c33;
  text-align: left;
}

.setting-row__arrow {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
</style>
