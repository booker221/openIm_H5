import { feedbackToast } from '@utils/common'
import { IMSDK } from '@/utils/imCommon'
import { ensureIMLogin } from '@/utils/imLogin'
import { MessageType } from '@openim/wasm-client-sdk'
import type {
  MessageItem,
  RevokedInfo,
} from '@openim/wasm-client-sdk/lib/types/entity'
import { GetAdvancedHistoryMsgParams } from '@openim/wasm-client-sdk/lib/types/params'
import { defineStore } from 'pinia'
import store from '../index'

interface StateType {
  historyMessageList: ExMessageItem[]
  hasMore: boolean
  quoteMessage?: ExMessageItem
  isMultiSelectMode: boolean
  selectedMessageKeys: string[]
  forwardMessageList: ExMessageItem[]
  pendingScrollMessageID: string
}

type ExType = {
  checked?: boolean
  isAppend?: boolean
  jump?: boolean
}

type GetHistoryMessageListFromReqResp = {
  messageIDList: string[]
}

export type ExMessageItem = MessageItem & ExType

export const getMessageUniqueKey = (message: Partial<MessageItem>) =>
  message.clientMsgID ||
  [
    message.sendID,
    message.recvID,
    message.groupID,
    message.sendTime,
    message.seq,
  ]
    .filter(Boolean)
    .join('_')

const mergeUniqueMessages = (messageList: ExMessageItem[]) => {
  const messageMap = new Map<string, ExMessageItem>()

  messageList.forEach((message) => {
    const key = getMessageUniqueKey(message)
    if (!key) return

    const previousMessage = messageMap.get(key)
    messageMap.set(
      key,
      previousMessage ? { ...previousMessage, ...message } : message,
    )
  })

  return Array.from(messageMap.values())
}

const buildRevokedMessage = (
  sourceMessage: ExMessageItem,
  revokedInfo: Partial<RevokedInfo> & Pick<RevokedInfo, 'clientMsgID'>,
): ExMessageItem => {
  const detail = {
    revokerID: revokedInfo.revokerID ?? sourceMessage.sendID,
    revokerRole: revokedInfo.revokerRole ?? 0,
    clientMsgID: revokedInfo.clientMsgID,
    revokerNickname:
      revokedInfo.revokerNickname ?? sourceMessage.senderNickname ?? '',
    revokeTime: revokedInfo.revokeTime ?? Date.now(),
    sourceMessageSendTime:
      revokedInfo.sourceMessageSendTime ?? sourceMessage.sendTime ?? 0,
    sourceMessageSendID: revokedInfo.sourceMessageSendID ?? sourceMessage.sendID,
    sourceMessageSenderNickname:
      revokedInfo.sourceMessageSenderNickname ??
      sourceMessage.senderNickname ??
      '',
    sessionType: revokedInfo.sessionType ?? sourceMessage.sessionType ?? 0,
    seq: revokedInfo.seq ?? sourceMessage.seq ?? 0,
    ex: revokedInfo.ex ?? sourceMessage.ex ?? '',
  }

  return {
    ...sourceMessage,
    contentType: MessageType.RevokeMessage,
    notificationElem: {
      detail: JSON.stringify(detail),
    },
    textElem: undefined,
    cardElem: undefined,
    pictureElem: undefined,
    soundElem: undefined,
    videoElem: undefined,
    fileElem: undefined,
    mergeElem: undefined,
    atTextElem: undefined,
    faceElem: undefined,
    locationElem: undefined,
    customElem: undefined,
    quoteElem: undefined,
    advancedTextElem: undefined,
    typingElem: undefined,
  }
}

const useStore = defineStore('message', {
  state: (): StateType => ({
    historyMessageList: [],
    hasMore: true,
    quoteMessage: undefined,
    isMultiSelectMode: false,
    selectedMessageKeys: [],
    forwardMessageList: [],
    pendingScrollMessageID: '',
  }),
  getters: {
    storeHistoryMessageList: (state) => state.historyMessageList,
    storeHistoryMessageHasMore: (state) => state.hasMore,
    storeQuoteMessage: (state) => state.quoteMessage,
    storeIsMultiSelectMode: (state) => state.isMultiSelectMode,
    storeSelectedMessageKeys: (state) => state.selectedMessageKeys,
    storeSelectedMessages: (state) =>
      state.historyMessageList.filter((message) =>
        state.selectedMessageKeys.includes(getMessageUniqueKey(message)),
      ),
    storeForwardMessageList: (state) => state.forwardMessageList,
    storePendingScrollMessageID: (state) => state.pendingScrollMessageID,
  },
  actions: {
    async getHistoryMessageListFromReq(
      params: GetAdvancedHistoryMsgParams,
    ): Promise<GetHistoryMessageListFromReqResp> {
      const isFirstPage = params.startClientMsgID === ''
      try {
        const isLogged = await ensureIMLogin()
        if (!isLogged) {
          throw new Error('IM login not ready')
        }
        const { data: tmpData } = await IMSDK.getAdvancedHistoryMessageList(params)
        this.historyMessageList = mergeUniqueMessages([
          ...tmpData.messageList,
          ...(isFirstPage ? [] : this.historyMessageList),
        ])
        this.hasMore = tmpData.messageList.length !== 0
        return {
          messageIDList: tmpData.messageList.map(
            (message: MessageItem) => message.clientMsgID,
          ),
        }
      } catch (error) {
        feedbackToast({ message: 'Get history message failed', error })
        this.hasMore = false
        return {
          messageIDList: [],
        }
      }
    },
    pushNewMessage(message: MessageItem) {
      const idx = this.historyMessageList.findIndex(
        (msg) => getMessageUniqueKey(msg) === getMessageUniqueKey(message),
      )

      if (idx !== -1) {
        this.historyMessageList[idx] = {
          ...this.historyMessageList[idx],
          ...message,
        }
        return
      }

      this.historyMessageList.push(message)
    },
    updateOneMessage(message: ExMessageItem, isSuccessCallBack = false) {
      const idx = this.historyMessageList.findIndex(
        (msg) => getMessageUniqueKey(msg) === getMessageUniqueKey(message),
      )
      if (idx !== -1) {
        this.historyMessageList[idx] = {
          ...this.historyMessageList[idx],
          ...message,
        }
      }
    },
    markMessageRevoked(
      revokedInfo: Partial<RevokedInfo> & Pick<RevokedInfo, 'clientMsgID'>,
      fallbackMessage?: ExMessageItem,
    ) {
      const idx = this.historyMessageList.findIndex(
        (msg) => msg.clientMsgID === revokedInfo.clientMsgID,
      )
      const sourceMessage =
        idx !== -1 ? this.historyMessageList[idx] : fallbackMessage

      if (!sourceMessage) {
        return
      }

      const revokedMessage = buildRevokedMessage(sourceMessage, revokedInfo)

      if (idx !== -1) {
        this.historyMessageList[idx] = revokedMessage
      }

      if (this.quoteMessage?.clientMsgID === revokedInfo.clientMsgID) {
        this.quoteMessage = undefined
      }
    },
    setQuoteMessage(message?: ExMessageItem) {
      this.quoteMessage = message
    },
    clearQuoteMessage() {
      this.quoteMessage = undefined
    },
    enterMultiSelectMode(message?: ExMessageItem) {
      this.isMultiSelectMode = true
      this.selectedMessageKeys = []
      if (message) {
        this.toggleMessageSelected(message)
      }
    },
    exitMultiSelectMode() {
      this.isMultiSelectMode = false
      this.selectedMessageKeys = []
    },
    toggleMessageSelected(message: ExMessageItem) {
      const key = getMessageUniqueKey(message)
      if (!key) return

      const idx = this.selectedMessageKeys.findIndex(
        (selectedKey) => selectedKey === key,
      )
      if (idx > -1) {
        const tmpKeys = [...this.selectedMessageKeys]
        tmpKeys.splice(idx, 1)
        this.selectedMessageKeys = tmpKeys
        return
      }

      this.selectedMessageKeys = [...this.selectedMessageKeys, key]
    },
    isMessageSelected(message: Partial<MessageItem>) {
      const key = getMessageUniqueKey(message)
      if (!key) return false
      return this.selectedMessageKeys.includes(key)
    },
    selectAllMessages() {
      this.selectedMessageKeys = this.historyMessageList
        .map((message) => getMessageUniqueKey(message))
        .filter(Boolean)
    },
    clearSelectedMessages() {
      this.selectedMessageKeys = []
    },
    setForwardMessageList(messageList: ExMessageItem[]) {
      this.forwardMessageList = [...messageList]
    },
    clearForwardMessageList() {
      this.forwardMessageList = []
    },
    removeMessages(messageList: Partial<MessageItem>[]) {
      const removeKeySet = new Set(
        messageList.map((message) => getMessageUniqueKey(message)).filter(Boolean),
      )

      this.historyMessageList = this.historyMessageList.filter(
        (message) => !removeKeySet.has(getMessageUniqueKey(message)),
      )
      this.selectedMessageKeys = this.selectedMessageKeys.filter(
        (key) => !removeKeySet.has(key),
      )
    },
    resetHistoryMessageList() {
      this.historyMessageList = []
      this.hasMore = true
      this.quoteMessage = undefined
      this.isMultiSelectMode = false
      this.selectedMessageKeys = []
      this.forwardMessageList = []
      this.pendingScrollMessageID = ''
    },
    replaceHistoryMessageList(messageList: ExMessageItem[], hasMore = true) {
      this.historyMessageList = mergeUniqueMessages(messageList)
      this.hasMore = hasMore
      this.quoteMessage = undefined
      this.isMultiSelectMode = false
      this.selectedMessageKeys = []
    },
    setPendingScrollMessageID(clientMsgID = '') {
      this.pendingScrollMessageID = clientMsgID
    },
    updateMessageNicknameAndFaceUrl({
      sendID,
      senderFaceUrl,
      senderNickname,
    }: {
      sendID: string
      senderFaceUrl: string
      senderNickname: string
    }) {
      const tmpList = [...this.historyMessageList].map((message) => {
        if (message.sendID === sendID) {
          message.senderFaceUrl = senderFaceUrl
          message.senderNickname = senderNickname
        }
        return message
      })
      this.historyMessageList = tmpList
    },
  },
})

export default function useMessageStore() {
  return useStore(store)
}
