<template>
  <div class="page_container !bg-white">
    <NavBar :title="$t('search')" />
    <van-search
      v-model="keyword"
      background="#fff"
      class="van-search_no_b"
      :placeholder="$t('search')"
      autofocus
      clearable
    />

    <van-tabs v-model:active="activeTab" animated shrink>
      <van-tab :title="$t('globalSearchAll')" />
      <van-tab :title="$t('globalSearchContacts')" />
      <van-tab :title="$t('globalSearchGroup')" />
      <van-tab :title="$t('globalSearchChatHistory')" />
      <van-tab :title="$t('globalSearchChatFile')" />
    </van-tabs>

    <div
      v-if="searching"
      class="flex flex-1 items-center justify-center bg-white px-[22px] py-10"
    >
      <van-loading size="24" type="spinner" />
    </div>

    <div
      v-else-if="!keyword.trim()"
      class="flex flex-1 items-center justify-center bg-[#F8F9FA] px-6 text-center text-sub-text"
    >
      {{ $t('searchHint') }}
    </div>

    <div
      v-else-if="showEmpty"
      class="flex flex-1 items-center justify-center bg-[#F8F9FA] px-6 text-center text-sub-text"
    >
      {{ $t('searchNoResult') }}
    </div>

    <div v-else class="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <template v-if="activeTab === 0">
        <template v-if="contacts.length">
          <div class="section_title">{{ $t('globalSearchContacts') }}</div>
          <div class="section_block">
            <div
              v-for="friend in contacts"
              :key="friend.userID"
              class="result_row"
              @click="openFriend(friend.userID)"
            >
              <Avatar :src="friend.faceURL" :desc="friend.nickname" :size="42" />
              <div class="result_body">
                <div class="truncate text-sm text-[#0C1C33]">
                  {{ friend.remark || friend.nickname || friend.userID }}
                </div>
                <div class="mt-1 truncate text-xs text-sub-text">{{ friend.userID }}</div>
              </div>
            </div>
          </div>
        </template>

        <template v-if="groups.length">
          <div class="section_title">{{ $t('globalSearchGroup') }}</div>
          <div class="section_block">
            <div
              v-for="group in groups"
              :key="group.groupID"
              class="result_row"
              @click="openGroup(group)"
            >
              <Avatar :src="group.faceURL" :desc="group.groupName" :size="42" is-group />
              <div class="result_body">
                <div class="truncate text-sm text-[#0C1C33]">
                  {{ group.groupName || group.groupID }}
                </div>
                <div class="mt-1 truncate text-xs text-sub-text">{{ group.groupID }}</div>
              </div>
            </div>
          </div>
        </template>

        <template v-if="flattenedTextMessages.length">
          <div class="section_title">{{ $t('globalSearchChatHistory') }}</div>
          <div class="section_block">
            <div
              v-for="item in flattenedTextMessages"
              :key="item.message.clientMsgID"
              class="result_row items-start"
              @click="openConversation(item.conversationID)"
            >
              <Avatar
                :src="item.message.senderFaceUrl"
                :desc="item.message.senderNickname"
                :size="40"
              />
              <div class="result_body">
                <div class="flex items-center justify-between gap-3">
                  <div class="truncate text-sm text-[#0C1C33]">
                    {{ item.showName || item.message.senderNickname }}
                  </div>
                  <div class="whitespace-nowrap text-xs text-sub-text">
                    {{ formatConversionTime(item.message.sendTime) }}
                  </div>
                </div>
                <div class="mt-1 truncate text-xs text-sub-text">
                  {{ getMessagePreviewText(item.message) }}
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-if="flattenedFileMessages.length">
          <div class="section_title">{{ $t('globalSearchChatFile') }}</div>
          <div class="section_block">
            <div
              v-for="item in flattenedFileMessages"
              :key="item.message.clientMsgID"
              class="result_row items-start"
              @click="openConversation(item.conversationID)"
            >
              <div
                class="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] bg-[#F2F8FF] text-primary"
              >
                <van-icon name="description-o" size="20" />
              </div>
              <div class="result_body">
                <div class="flex items-center justify-between gap-3">
                  <div class="truncate text-sm text-[#0C1C33]">
                    {{ item.message.fileElem?.fileName || item.showName }}
                  </div>
                  <div class="whitespace-nowrap text-xs text-sub-text">
                    {{ formatConversionTime(item.message.sendTime) }}
                  </div>
                </div>
                <div class="mt-1 truncate text-xs text-sub-text">
                  {{ item.showName }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>

      <div v-if="activeTab === 1" class="section_block !mt-0">
        <div
          v-for="friend in contacts"
          :key="friend.userID"
          class="result_row"
          @click="openFriend(friend.userID)"
        >
          <Avatar :src="friend.faceURL" :desc="friend.nickname" :size="42" />
          <div class="result_body">
            <div class="truncate text-sm text-[#0C1C33]">
              {{ friend.remark || friend.nickname || friend.userID }}
            </div>
            <div class="mt-1 truncate text-xs text-sub-text">{{ friend.userID }}</div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 2" class="section_block !mt-0">
        <div
          v-for="group in groups"
          :key="group.groupID"
          class="result_row"
          @click="openGroup(group)"
        >
          <Avatar :src="group.faceURL" :desc="group.groupName" :size="42" is-group />
          <div class="result_body">
            <div class="truncate text-sm text-[#0C1C33]">
              {{ group.groupName || group.groupID }}
            </div>
            <div class="mt-1 truncate text-xs text-sub-text">{{ group.groupID }}</div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 3" class="section_block !mt-0">
        <div
          v-for="item in flattenedTextMessages"
          :key="item.message.clientMsgID"
          class="result_row items-start"
          @click="openConversation(item.conversationID)"
        >
          <Avatar
            :src="item.message.senderFaceUrl"
            :desc="item.message.senderNickname"
            :size="40"
          />
          <div class="result_body">
            <div class="flex items-center justify-between gap-3">
              <div class="truncate text-sm text-[#0C1C33]">
                {{ item.showName || item.message.senderNickname }}
              </div>
              <div class="whitespace-nowrap text-xs text-sub-text">
                {{ formatConversionTime(item.message.sendTime) }}
              </div>
            </div>
            <div class="mt-1 truncate text-xs text-sub-text">
              {{ getMessagePreviewText(item.message) }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 4" class="section_block !mt-0">
        <div
          v-for="item in flattenedFileMessages"
          :key="item.message.clientMsgID"
          class="result_row items-start"
          @click="openConversation(item.conversationID)"
        >
          <div
            class="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] bg-[#F2F8FF] text-primary"
          >
            <van-icon name="description-o" size="20" />
          </div>
          <div class="result_body">
            <div class="flex items-center justify-between gap-3">
              <div class="truncate text-sm text-[#0C1C33]">
                {{ item.message.fileElem?.fileName || item.showName }}
              </div>
              <div class="whitespace-nowrap text-xs text-sub-text">
                {{ formatConversionTime(item.message.sendTime) }}
              </div>
            </div>
            <div class="mt-1 truncate text-xs text-sub-text">
              {{ item.showName }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Avatar from '@/components/Avatar/index.vue'
import NavBar from '@/components/NavBar/index.vue'
import { useDebounceFn } from '@vueuse/core'
import useAppConfigStore from '@/store/modules/appConfig'
import useContactStore from '@/store/modules/contact'
import useConversationStore from '@/store/modules/conversation'
import useUserStore from '@/store/modules/user'
import { feedbackToast } from '@/utils/common'
import { IMSDK, conversationSort, formatConversionTime } from '@/utils/imCommon'
import { getMessagePreviewText } from '../chat/components/MessageItem/messageUtils'
import type {
  ConversationItem,
  GroupItem,
  MessageItem,
  SearchMessageResultItem,
  SearchedFriendsInfo,
} from '@openim/wasm-client-sdk/lib/types/entity'
import { MessageType } from '@openim/wasm-client-sdk'

type FlattenedMessageResult = {
  conversationID: string
  showName: string
  message: MessageItem
}

const { t } = useI18n()
const router = useRouter()
const contactStore = useContactStore()
const conversationStore = useConversationStore()
const userStore = useUserStore()
const appConfigStore = useAppConfigStore()

const keyword = ref('')
const activeTab = ref(0)
const searching = ref(false)
const contacts = ref<SearchedFriendsInfo[]>([])
const groups = ref<GroupItem[]>([])
const textMessageResults = ref<SearchMessageResultItem[]>([])
const fileMessageResults = ref<SearchMessageResultItem[]>([])
let searchTaskId = 0

const flattenedTextMessages = computed<FlattenedMessageResult[]>(() =>
  textMessageResults.value.flatMap((item) =>
    (item.messageList ?? []).map((message) => ({
      conversationID: item.conversationID,
      showName: item.showName,
      message,
    })),
  ),
)

const flattenedFileMessages = computed<FlattenedMessageResult[]>(() =>
  fileMessageResults.value.flatMap((item) =>
    (item.messageList ?? []).map((message) => ({
      conversationID: item.conversationID,
      showName: item.showName,
      message,
    })),
  ),
)

const showEmpty = computed(() => {
  switch (activeTab.value) {
    case 1:
      return contacts.value.length === 0
    case 2:
      return groups.value.length === 0
    case 3:
      return flattenedTextMessages.value.length === 0
    case 4:
      return flattenedFileMessages.value.length === 0
    default:
      return (
        contacts.value.length === 0 &&
        groups.value.length === 0 &&
        flattenedTextMessages.value.length === 0 &&
        flattenedFileMessages.value.length === 0
      )
  }
})

const clearResults = () => {
  contacts.value = []
  groups.value = []
  textMessageResults.value = []
  fileMessageResults.value = []
}

const searchContacts = async (searchValue: string) => {
  const { data } = await IMSDK.searchFriends({
    keywordList: [searchValue],
    isSearchUserID: true,
    isSearchNickname: true,
    isSearchRemark: true,
  })
  return data
}

const searchGroups = async (searchValue: string) => {
  const { data } = await IMSDK.searchGroups({
    keywordList: [searchValue],
    isSearchGroupID: false,
    isSearchGroupName: true,
  })
  if (data.length > 0) {
    return data
  }

  const canSearchByGroupID =
    Number((userStore.storeSelfInfo as any).userType ?? 1) !== 0 ||
    !!appConfigStore.storeAppConfig?.groups_switch

  if (!canSearchByGroupID) {
    return []
  }

  const exactResult = await IMSDK.getSpecifiedGroupsInfo([searchValue])
  return exactResult.data.filter(Boolean)
}

const searchMessages = async (searchValue: string, messageTypeList: MessageType[]) => {
  const { data } = await IMSDK.searchLocalMessages({
    conversationID: '',
    keywordList: [searchValue],
    messageTypeList,
    pageIndex: 1,
    count: 20,
  })
  return data.searchResultItems ?? data.findResultItems ?? []
}

const performSearch = async () => {
  const searchValue = keyword.value.trim()
  const currentTaskId = ++searchTaskId

  if (!searchValue) {
    clearResults()
    searching.value = false
    return
  }

  searching.value = true

  try {
    switch (activeTab.value) {
      case 0: {
        const [contactList, groupList, textList, fileList] = await Promise.all([
          searchContacts(searchValue),
          searchGroups(searchValue),
          searchMessages(searchValue, [MessageType.TextMessage, MessageType.AtTextMessage]),
          searchMessages(searchValue, [MessageType.FileMessage]),
        ])
        if (currentTaskId !== searchTaskId) return
        contacts.value = contactList
        groups.value = groupList
        textMessageResults.value = textList
        fileMessageResults.value = fileList
        break
      }
      case 1:
        contacts.value = await searchContacts(searchValue)
        break
      case 2:
        groups.value = await searchGroups(searchValue)
        break
      case 3:
        textMessageResults.value = await searchMessages(searchValue, [
          MessageType.TextMessage,
          MessageType.AtTextMessage,
        ])
        break
      case 4:
        fileMessageResults.value = await searchMessages(searchValue, [
          MessageType.FileMessage,
        ])
        break
      default:
        break
    }
  } catch (error) {
    if (currentTaskId !== searchTaskId) return
    clearResults()
    feedbackToast({ message: t('messageTip.searchMessageFailed'), error })
  } finally {
    if (currentTaskId === searchTaskId) {
      searching.value = false
    }
  }
}

const debouncedSearch = useDebounceFn(performSearch, 250)

const ensureConversationLoaded = async (conversationID: string) => {
  let conversation = conversationStore.storeConversationList.find(
    (item) => item.conversationID === conversationID,
  )
  let offset = conversationStore.storeConversationList.length

  while (!conversation) {
    const { data } = await IMSDK.getConversationListSplit({
      offset,
      count: 100,
    })

    if (!data.length) {
      break
    }

    const merged = conversationSort([
      ...conversationStore.storeConversationList,
      ...data,
    ]) as ConversationItem[]

    conversationStore.updateConversationList(merged)
    conversation = merged.find((item) => item.conversationID === conversationID)
    offset += data.length

    if (data.length < 100) {
      break
    }
  }

  return conversation
}

const openFriend = async (userID: string) => {
  await contactStore.getUserCardData(userID)
}

const openGroup = (group: GroupItem) => {
  conversationStore.updateCurrentGroupInfo(group)
  router.push('/groupCard')
}

const openConversation = async (conversationID: string) => {
  const conversation = await ensureConversationLoaded(conversationID)
  if (!conversation) {
    feedbackToast({ message: t('messageTip.getConversationFailed'), error: true })
    return
  }

  conversationStore.updateCurrentConversation(conversation)
  router.push('/chat')
}

watch(keyword, () => {
  clearResults()
  debouncedSearch()
})

watch(activeTab, () => {
  clearResults()
  debouncedSearch()
})
</script>

<style scoped lang="scss">
.section_title {
  padding: 12px 22px 8px;
  font-size: 12px;
  color: var(--sub-text);
}

.section_block {
  margin-top: 0;
  background: #fff;
}

.result_row {
  display: flex;
  align-items: center;
  padding: 12px 22px;
}

.result_body {
  min-width: 0;
  flex: 1;
  margin-left: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f1f1;
}

.section_block .result_row:last-child .result_body {
  border-bottom: none;
}
</style>
