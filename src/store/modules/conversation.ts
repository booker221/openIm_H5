import { IMSDK } from '@/utils/imCommon'
import {
  clearCurrentConversation,
  getCurrentConversation,
  setCurrentConversation,
} from '@/utils/storage'
import type {
  ConversationItem,
  GroupItem,
  GroupMemberItem,
  MessageItem,
} from '@openim/wasm-client-sdk/lib/types/entity'

import { defineStore } from 'pinia'
import store from '../index'
import useContactStore from './contact'
import useUserStore from './user'

interface StateType {
  conversationList: ConversationItem[]
  currentConversation: ConversationItem
  unReadCount: number
  currentGroupInfo: GroupItem
  currentMemberInGroup?: GroupMemberItem
}

const useStore = defineStore('conversation', {
  state: (): StateType => ({
    conversationList: [],
    currentConversation: {} as ConversationItem,
    unReadCount: 0,
    currentGroupInfo: {} as GroupItem,
    currentMemberInGroup: {} as GroupMemberItem,
  }),
  getters: {
    storeConversationList: (state) => state.conversationList,
    storeCurrentConversation: (state) => state.currentConversation,
    storeUnReadCount: (state) => state.unReadCount,
    storeCurrentGroupInfo: (state) => state.currentGroupInfo,
    storeCurrentMemberInGroup: (state) => state.currentMemberInGroup,
  },
  actions: {
    async getConversationListFromReq(isScrollLoad = false): Promise<boolean> {
      try {
        const { data } = await IMSDK.getConversationListSplit({
          offset: isScrollLoad ? this.conversationList.length : 0,
          count: 20,
        })
        const cves = data
        this.conversationList = [
          ...(isScrollLoad ? this.conversationList : []),
          ...cves,
        ]
        return cves.length === 20
      } catch (error) {
        console.error(error)
        return false
      }
    },
    async getUnReadCountFromReq() {
      const { data } = await IMSDK.getTotalUnreadMsgCount()
      this.unReadCount = data
    },
    updateUnReadCount(data: number) {
      this.unReadCount = data
    },
    async getCurrentGroupInfoFromReq(groupID?: string) {
      const contactStore = useContactStore()
      const sourceID = groupID ?? this.currentConversation.groupID
      const localGroup = contactStore.storeGroupList.find(
        (group) => group.groupID === sourceID,
      )
      if (localGroup) {
        this.currentGroupInfo = localGroup
        return
      }
      try {
        const { data } = await IMSDK.getSpecifiedGroupsInfo([sourceID])
        this.currentGroupInfo = data[0] ?? {}
      } catch (error) {
        console.error(error)
      }
    },
    updateCurrentGroupInfo(item: GroupItem) {
      this.currentGroupInfo = { ...item }
    },
    async getCurrentMemberInGroupFromReq(groupID?: string) {
      const userStore = useUserStore()

      try {
        const { data } = await IMSDK.getSpecifiedGroupMembersInfo({
          groupID: groupID ?? this.currentConversation.groupID,
          userIDList: [userStore.storeSelfInfo.userID],
        })
        this.currentMemberInGroup = data[0] ?? {}
      } catch (error) {
        console.error(error)
      }
    },
    updateCurrentMemberInGroup(item?: GroupMemberItem) {
      this.currentMemberInGroup = item
    },
    updateCurrentConversation(item: ConversationItem) {
      this.currentConversation = { ...item }
      if (item?.conversationID) {
        setCurrentConversation(item)
      }
    },
    async restoreCurrentConversation() {
      if (this.currentConversation.conversationID) {
        return true
      }

      const cachedConversation = getCurrentConversation<ConversationItem>()
      if (!cachedConversation?.conversationID) {
        return false
      }

      const existingConversation = this.conversationList.find(
        (conversation) =>
          conversation.conversationID === cachedConversation.conversationID,
      )
      if (existingConversation) {
        this.updateCurrentConversation(existingConversation)
        return true
      }

      try {
        const { data } = await IMSDK.getMultipleConversation([
          cachedConversation.conversationID,
        ])
        const restoredConversation = data[0]
        if (restoredConversation?.conversationID) {
          this.updateCurrentConversation(restoredConversation)
          return true
        }
      } catch (error) {
        console.error(error)
      }

      const sourceID = cachedConversation.groupID || cachedConversation.userID
      if (!sourceID || !cachedConversation.conversationType) {
        clearCurrentConversation()
        return false
      }

      try {
        const { data } = await IMSDK.getOneConversation({
          sourceID,
          sessionType: cachedConversation.conversationType,
        })
        if (data?.conversationID) {
          this.updateCurrentConversation(data)
          return true
        }
      } catch (error) {
        console.error(error)
      }

      clearCurrentConversation()
      return false
    },
    resetCurrentConversation() {
      this.currentConversation = {} as ConversationItem
    },
    updateConversationList(list: ConversationItem[]) {
      this.conversationList = [...list]
    },
    clearConversationStore() {
      this.conversationList = []
      this.resetCurrentConversation()
      clearCurrentConversation()
      this.unReadCount = 0
      this.currentGroupInfo = {} as GroupItem
      this.currentMemberInGroup = {} as GroupMemberItem
    },
  },
})

export default function useConversationStore() {
  return useStore(store)
}
