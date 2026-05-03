import { createFavorite } from '@/api/favorite'
import { ContactChooseEnum } from '@/pages/contact/chooseUser/data'
import useConversationStore from '@/store/modules/conversation'
import useMessageStore, { ExMessageItem } from '@/store/modules/message'
import useUserStore from '@/store/modules/user'
import { feedbackToast, useCopy } from '@/utils/common'
import { IMSDK } from '@/utils/imCommon'
import {
  buildFavoritePayload,
  getMessagePreviewText,
} from './components/MessageItem/messageUtils'
import { GroupMemberRole, SessionType } from '@openim/wasm-client-sdk'
import { showConfirmDialog } from 'vant'
import useSendMessage from '@/hooks/useSendMessage'

export default function useChatMessageActions() {
  const router = useRouter()
  const { t } = useI18n()
  const { copy } = useCopy()
  const messageStore = useMessageStore()
  const conversationStore = useConversationStore()
  const userStore = useUserStore()
  const { sendMessage } = useSendMessage()

  const getSelectedMessages = () => messageStore.storeSelectedMessages as ExMessageItem[]

  const getCurrentConversationID = () =>
    conversationStore.storeCurrentConversation.conversationID

  const isAdminOrOwner = computed(
    () =>
      (conversationStore.storeCurrentMemberInGroup?.roleLevel ?? 0) >=
      GroupMemberRole.Admin,
  )
  const isSingleChat = computed(
    () =>
      conversationStore.storeCurrentConversation.conversationType === SessionType.Single,
  )

  const canRecallMessage = (message: ExMessageItem) => {
    if (isSingleChat.value) {
      return message.sendID === userStore.storeSelfInfo.userID
    }

    if (isAdminOrOwner.value) {
      return true
    }

    return message.sendID === userStore.storeSelfInfo.userID
  }

  const canDeleteMessage = (message: ExMessageItem) =>
    message.sendID === userStore.storeSelfInfo.userID

  const copyMessage = (message: ExMessageItem) => {
    copy(getMessagePreviewText(message))
  }

  const quoteMessage = (message: ExMessageItem) => {
    messageStore.setQuoteMessage(message)
  }

  const enterMultiSelectMode = (message?: ExMessageItem) => {
    messageStore.enterMultiSelectMode(message)
  }

  const exitMultiSelectMode = () => {
    messageStore.exitMultiSelectMode()
  }

  const toggleMessageSelected = (message: ExMessageItem) => {
    messageStore.toggleMessageSelected(message)
  }

  const selectAllMessages = () => {
    if (
      messageStore.storeSelectedMessageKeys.length ===
      messageStore.storeHistoryMessageList.length
    ) {
      messageStore.clearSelectedMessages()
      return
    }

    messageStore.selectAllMessages()
  }

  const startForward = (messages: ExMessageItem[]) => {
    if (!messages.length) return
    messageStore.setForwardMessageList(messages)
    router.push({
      path: '/chooseUser',
      state: {
        chooseType: ContactChooseEnum.ForwardMessage,
      },
    })
  }

  const forwardMessage = (message: ExMessageItem) => {
    startForward([message])
  }

  const forwardSelectedMessages = () => {
    const selectedMessages = getSelectedMessages()
    if (!selectedMessages.length) {
      feedbackToast({ message: t('messageTip.selectMessage') })
      return
    }
    startForward(selectedMessages)
  }

  const favoriteMessage = async (message: ExMessageItem) => {
    const payload = buildFavoritePayload(message)
    if (!payload) {
      feedbackToast({ message: t('messageTip.unsupportedFavoriteMessage'), error: true })
      return
    }

    try {
      await createFavorite(payload)
      feedbackToast({ message: t('messageTip.favoriteSuccess') })
    } catch (error) {
      feedbackToast({ message: t('messageTip.favoriteFailed'), error })
    }
  }

  const recallMessage = async (message: ExMessageItem) => {
    const isSelfMessage = message.sendID === userStore.storeSelfInfo.userID
    if (!canRecallMessage(message)) {
      feedbackToast({ message: t('messageTip.canNotRevokeMessage'), error: true })
      return
    }

    const now = Date.now()
    if (
      now - (message.sendTime ?? 0) > 2 * 60 * 1000 &&
      !isAdminOrOwner.value
    ) {
      feedbackToast({ message: t('messageTip.revokeLimit'), error: true })
      return
    }

    try {
      await showConfirmDialog({
        title: t(isSelfMessage ? 'messageTip.revokeSelfTitle' : 'messageTip.revokeOtherTitle'),
        message: t(
          isSelfMessage
            ? 'messageTip.revokeSelfConfirm'
            : 'messageTip.revokeOtherConfirm',
        ),
      })
      await IMSDK.revokeMessage({
        conversationID: getCurrentConversationID(),
        clientMsgID: message.clientMsgID ?? '',
      })
      feedbackToast({ message: t('messageTip.revokeSuccess') })
    } catch (error) {
      if (error === 'cancel') return
      feedbackToast({ message: t('messageTip.revokeFailed'), error })
    }
  }

  const performDeleteMessages = async (messages: ExMessageItem[]) => {
    let failed = false

    for (const message of messages) {
      try {
        await IMSDK.deleteMessageFromLocalStorage({
          conversationID: getCurrentConversationID(),
          clientMsgID: message.clientMsgID ?? '',
        })
      } catch (error) {
        failed = true
      }
    }

    messageStore.removeMessages(messages)
    messageStore.clearQuoteMessage()

    if (messageStore.storeIsMultiSelectMode) {
      messageStore.exitMultiSelectMode()
    }

    feedbackToast({
      message: t(failed ? 'messageTip.someMessageDeleteFailed' : 'messageTip.deleteSuccess'),
      error: failed,
    })
  }

  const deleteMessage = async (message: ExMessageItem) => {
    if (!canDeleteMessage(message)) {
      feedbackToast({ message: t('messageTip.canNotDeleteMessage'), error: true })
      return
    }

    try {
      await showConfirmDialog({
        title: t('messageTip.deleteMessageTitle'),
        message: t('messageTip.deleteMessageConfirm'),
      })
      await performDeleteMessages([message])
    } catch (error) {
      if (error === 'cancel') return
      feedbackToast({ message: t('messageTip.deleteFailed'), error })
    }
  }

  const deleteSelectedMessages = async () => {
    const selectedMessages = getSelectedMessages()
    if (!selectedMessages.length) {
      feedbackToast({ message: t('messageTip.selectMessage') })
      return
    }

    try {
      await showConfirmDialog({
        title: t('messageTip.deleteMessageTitle'),
        message: t('messageTip.deleteMultiMessageConfirm', {
          count: selectedMessages.length,
        }),
      })
      await performDeleteMessages(selectedMessages)
    } catch (error) {
      if (error === 'cancel') return
      feedbackToast({ message: t('messageTip.deleteFailed'), error })
    }
  }

  const sendForwardMessagesToTargets = async (
    checkedList: Array<Partial<ExMessageItem> & { userID?: string; groupID?: string }>,
  ) => {
    const forwardMessages = messageStore.storeForwardMessageList
    if (!forwardMessages.length) return

    try {
      for (const target of checkedList) {
        for (const originalMessage of forwardMessages) {
          const { data: forwardMessage } = await IMSDK.createForwardMessage(
            originalMessage,
          )
          await sendMessage({
            recvID: target.userID,
            groupID: target.groupID,
            message: forwardMessage,
            needOpreateMessage: false,
          })
        }
      }
      messageStore.clearForwardMessageList()
      feedbackToast({ message: t('messageTip.forwardSuccess') })
    } catch (error) {
      feedbackToast({ message: t('messageTip.forwardFailed'), error })
    }
  }

  return {
    canDeleteMessage,
    canRecallMessage,
    copyMessage,
    deleteMessage,
    deleteSelectedMessages,
    enterMultiSelectMode,
    exitMultiSelectMode,
    favoriteMessage,
    forwardMessage,
    forwardSelectedMessages,
    quoteMessage,
    recallMessage,
    selectAllMessages,
    sendForwardMessagesToTargets,
    toggleMessageSelected,
  }
}
