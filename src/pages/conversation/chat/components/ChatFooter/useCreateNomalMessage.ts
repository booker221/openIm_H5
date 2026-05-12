import useMessageStore from '@/store/modules/message'
import { feedbackToast } from '@/utils/common'
import { IMSDK, getCleanText } from '@/utils/imCommon'
import type { MessageItem } from '@openim/wasm-client-sdk/lib/types/entity'
import { MessageType } from '@openim/wasm-client-sdk'
import { Ref, toRaw } from 'vue'
import { getMessagePreviewText } from '../MessageItem/messageUtils'
import { buildReplyCustomMessageData } from '@/utils/customMessage'

type CreateNomalMessageProps = {
  messageContent: Ref<string>
}

export default function useCreateNomalMessage({
  messageContent,
}: CreateNomalMessageProps) {
  const messageStore = useMessageStore()

  const getCleanTextWithBr = () => {
    let text = messageContent.value
    text = text.replace(/<div>/g, '\n').replace(/<\/div>/g, '')
    return getCleanText(text)
  }

  const getQuoteMessage = () =>
    messageStore.storeQuoteMessage
      ? (toRaw(messageStore.storeQuoteMessage) as MessageItem)
      : undefined

  const createReplyMessage = async (
    formattedText: string,
    quoteMessage: MessageItem,
  ) => {
    const quotePreview = getMessagePreviewText(quoteMessage)
    const quoteSenderNickname =
      quoteMessage.senderNickname || quoteMessage.sendID || ''
    const { data: textMessage } = await IMSDK.createTextMessage(formattedText)

    return {
      ...textMessage,
      contentType: MessageType.CustomMessage,
      textElem: undefined,
      customElem: {
        data: buildReplyCustomMessageData({
          content: formattedText,
          quoteMessageID: quoteMessage.clientMsgID ?? '',
          quotePreview,
          quoteSenderNickname,
        }),
        extension: 'reply',
        description: formattedText,
      },
    } as MessageItem
  }

  const getTextMessage = async () => {
    const formattedText = getCleanTextWithBr()
    const quoteMessage = getQuoteMessage()

    if (quoteMessage) {
      return createReplyMessage(formattedText, quoteMessage)
    }

    return (await IMSDK.createTextMessage(formattedText)).data
  }

  const switchNomalMessage = async () => {
    try {
      const message = (await getTextMessage()) as MessageItem
      if (!message) {
        feedbackToast({
          error: 'create message failed',
          message: 'create message failed',
        })
        return
      }

      return message
    } catch (error: any) {
      feedbackToast({
        error,
        message: error?.errMsg || error?.message || 'create message failed',
      })
    }
  }

  return {
    switchNomalMessage,
    getCleanText,
  }
}
