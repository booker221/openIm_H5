import useConversationStore from '@/store/modules/conversation'
import { feedbackToast } from '@/utils/common'
import { IMSDK } from '@/utils/imCommon'
import type { ConversationItem } from '@openim/wasm-client-sdk/lib/types/entity'
import { SessionType } from '@openim/wasm-client-sdk'

export default function useConversationToggle() {
  const router = useRouter()
  const conversationStore = useConversationStore()

  const isGroupConversation = (sessionType: SessionType) =>
    Number(sessionType) === Number(SessionType.Group) ||
    Number(sessionType) === Number(SessionType.WorkingGroup)

  const isSameConversation = (
    item: ConversationItem,
    sourceID: string,
    sessionType: SessionType,
  ) => {
    if (item.conversationType !== sessionType) {
      return false
    }
    return isGroupConversation(sessionType)
      ? item.groupID === sourceID
      : item.userID === sourceID
  }

  const getConversation = async ({
    sourceID,
    sessionType,
  }: {
    sourceID: string
    sessionType: SessionType
  }): Promise<ConversationItem | undefined> => {
    let conversation = conversationStore.conversationList.find(
      (item) => isSameConversation(item, sourceID, sessionType),
    )
    if (!conversation) {
      try {
        conversation = (
          await IMSDK.getOneConversation({
            sourceID,
            sessionType,
          })
        ).data
      } catch (error) {
        feedbackToast({ error })
      }
    }
    return conversation
  }

  const toSpecifiedConversation = async (data: {
    sourceID: string
    sessionType: SessionType
  }) => {
    const conversation = await getConversation(data)
    if (!conversation) return
    conversationStore.updateCurrentConversation({ ...conversation })
    router.push('chat')
  }

  return {
    toSpecifiedConversation,
  }
}
