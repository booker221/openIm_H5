import useConversationStore from '@/store/modules/conversation'
import useMessageStore, { ExMessageItem } from '@/store/modules/message'
import useUserStore from '@/store/modules/user'
import emitter from '@/utils/events'
import { conversationSort, IMSDK } from '@/utils/imCommon'
import type {
  ConversationItem,
  MessageItem,
} from '@openim/wasm-client-sdk/lib/types/entity'
import { MessageStatus } from '@openim/wasm-client-sdk'
import { SendMsgParams } from '@openim/wasm-client-sdk/lib/types/params'

const messageStore = useMessageStore()
const conversationStore = useConversationStore()
const userStore = useUserStore()

type SendMessageParams = Partial<Omit<SendMsgParams, 'message'>> & {
  message: MessageItem
  needOpreateMessage?: boolean
}

export default function useSendMessage() {
  const upsertConversation = (conversation: ConversationItem) => {
    if (!conversation?.conversationID) return

    const conversations = conversationStore.storeConversationList.filter(
      (item) => item.conversationID !== conversation.conversationID,
    )
    conversationStore.updateConversationList(
      conversationSort([conversation, ...conversations]),
    )

    if (
      conversationStore.storeCurrentConversation.conversationID ===
      conversation.conversationID
    ) {
      conversationStore.updateCurrentConversation(conversation)
    }
  }

  const refreshConversationSummary = async (latestMessage: MessageItem) => {
    const currentConversation = conversationStore.storeCurrentConversation
    if (!currentConversation.conversationID) return

    upsertConversation({
      ...currentConversation,
      latestMsg: JSON.stringify(latestMessage),
      latestMsgSendTime: latestMessage.sendTime || Date.now(),
    })

    try {
      const { data } = await IMSDK.getMultipleConversation([
        currentConversation.conversationID,
      ])
      if (data[0]?.conversationID) {
        upsertConversation(data[0])
      }
    } catch (error) {
      console.error(error)
    }
  }

  const sendMessage = async ({
    recvID,
    groupID,
    message,
    needOpreateMessage,
  }: SendMessageParams) => {
    needOpreateMessage = needOpreateMessage ?? inCurrentConversation(recvID || groupID)

    if (needOpreateMessage) {
      messageStore.pushNewMessage(message)
      emitter.emit('CHAT_MAIN_SCROLL_TO_BOTTOM', false)
    }

    const options = {
      recvID: recvID ?? conversationStore.storeCurrentConversation.userID ?? '',
      groupID: groupID ?? conversationStore.storeCurrentConversation.groupID ?? '',
      message,
    }
    try {
      // @ts-ignore
      const { data: successMessage } = await IMSDK.sendMessage(options)
      messageStore.updateOneMessage(successMessage as ExMessageItem, true)
      refreshConversationSummary(successMessage)
    } catch (error) {
      console.error(error)

      messageStore.updateOneMessage({
        ...message,
        status: MessageStatus.Failed,
      })
    }
  }

  const inCurrentConversation = (sourceID?: string) =>
    sourceID
      ? conversationStore.storeCurrentConversation.userID === sourceID ||
        conversationStore.storeCurrentConversation.groupID === sourceID
      : true

  return {
    sendMessage,
  }
}
