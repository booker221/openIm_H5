<template>
  <div class="page_container !bg-white">
    <NavBar :title="$t('popover.chatRecord')" />

    <div class="border-b border-[#E8EAEF] px-4 py-2">
      <van-search
        v-model="keyword"
        shape="round"
        :placeholder="$t('searchChatHistoryPlaceholder')"
        show-action
        @search="onSearch"
        @clear="clearSearch"
      >
        <template #action>
          <div class="text-sm text-primary" @click="onSearch">
            {{ $t('search') }}
          </div>
        </template>
      </van-search>
    </div>

    <div
      v-if="showEmptyHint"
      class="flex flex-1 items-center justify-center px-6 text-center text-sub-text"
    >
      {{ $t('searchChatHistoryHint') }}
    </div>

    <div
      v-else-if="showNoResult"
      class="flex flex-1 items-center justify-center px-6 text-center text-sub-text"
    >
      {{ $t('searchChatHistoryNoResult') }}
    </div>

    <div v-else class="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div
        v-if="searching && !messageList.length"
        class="flex h-full items-center justify-center"
      >
        <van-loading type="spinner" />
      </div>

      <van-list
        v-else
        v-model:loading="loadingMore"
        :finished="finished"
        :immediate-check="false"
        :finished-text="$t('noMore')"
        @load="loadMore"
      >
        <div
          v-for="message in messageList"
          :key="message.clientMsgID"
          class="mx-4 mt-3 rounded-[12px] bg-white px-4 py-4"
          @click="openMessage(message)"
        >
          <div class="flex items-start gap-3">
            <Avatar
              :size="40"
              :src="message.senderFaceUrl"
              :desc="message.senderNickname"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-3">
                <div class="truncate text-sm text-[#0C1C33]">
                  {{ message.senderNickname || message.sendID }}
                </div>
                <div class="whitespace-nowrap text-xs text-sub-text">
                  {{ formatMessageTime(message.sendTime, true) }}
                </div>
              </div>
              <div class="mt-2 rounded-[8px] bg-[#F8F9FA] px-3 py-3 text-sm text-[#0C1C33]">
                {{ getMessagePreviewText(message) }}
              </div>
            </div>
          </div>
        </div>
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import Avatar from '@/components/Avatar/index.vue'
import NavBar from '@/components/NavBar/index.vue'
import useConversationStore from '@/store/modules/conversation'
import useMessageStore, { ExMessageItem } from '@/store/modules/message'
import { feedbackToast } from '@/utils/common'
import { IMSDK, formatMessageTime } from '@/utils/imCommon'
import { getMessagePreviewText } from '../chat/components/MessageItem/messageUtils'
import { MessageItem, ViewType } from '@openim/wasm-client-sdk'

const { t } = useI18n()
const router = useRouter()
const conversationStore = useConversationStore()
const messageStore = useMessageStore()

const keyword = ref('')
const messageList = ref<MessageItem[]>([])
const loadingMore = ref(false)
const searching = ref(false)
const finished = ref(false)
const searched = ref(false)
const pageIndex = ref(1)
const pageSize = 20

const conversationID = computed(
  () => conversationStore.storeCurrentConversation.conversationID,
)

const showEmptyHint = computed(
  () =>
    !searching.value &&
    !searched.value &&
    !keyword.value.trim() &&
    messageList.value.length === 0,
)

const showNoResult = computed(
  () =>
    !searching.value &&
    searched.value &&
    messageList.value.length === 0,
)

const clearSearch = () => {
  searched.value = false
  messageList.value = []
  finished.value = false
  pageIndex.value = 1
}

const searchMessages = async (isRefresh = false) => {
  const searchValue = keyword.value.trim()
  if (!searchValue || !conversationID.value) {
    clearSearch()
    return
  }

  if (isRefresh) {
    pageIndex.value = 1
    messageList.value = []
    finished.value = false
  }

  if (isRefresh) {
    searching.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const { data } = await IMSDK.searchLocalMessages({
      conversationID: conversationID.value,
      keywordList: [searchValue],
      messageTypeList: [],
      pageIndex: pageIndex.value,
      count: pageSize,
    })

    const resultItems = data.searchResultItems ?? data.findResultItems ?? []
    const messages = resultItems[0]?.messageList ?? []

    messageList.value = isRefresh
      ? messages
      : [...messageList.value, ...messages]
    finished.value = messages.length < pageSize
    pageIndex.value += 1
    searched.value = true
  } catch (error) {
    feedbackToast({ message: t('messageTip.searchMessageFailed'), error })
    finished.value = true
  } finally {
    searching.value = false
    loadingMore.value = false
  }
}

const onSearch = () => {
  searchMessages(true)
}

const loadMore = () => {
  if (finished.value || !keyword.value.trim()) {
    loadingMore.value = false
    return
  }

  searchMessages(false)
}

const openMessage = async (message: MessageItem) => {
  try {
    const { data } = await IMSDK.fetchSurroundingMessages({
      startMessage: message,
      viewType: ViewType.History,
      before: 20,
      after: 20,
    })

    const messageListWithJump = (data.messageList ?? []).map((item) => ({
      ...item,
      jump: item.clientMsgID === message.clientMsgID,
    })) as ExMessageItem[]

    messageStore.replaceHistoryMessageList(messageListWithJump)
    messageStore.setPendingScrollMessageID(message.clientMsgID)
    router.replace('/chat')
  } catch (error) {
    feedbackToast({ message: t('messageTip.getConversationFailed'), error })
  }
}

onMounted(async () => {
  if (!conversationStore.storeCurrentConversation.conversationID) {
    const restored = await conversationStore.restoreCurrentConversation()
    if (!restored) {
      router.replace('/conversation')
      return
    }
  }

  if (!conversationStore.storeCurrentConversation.conversationID) {
    router.replace('/conversation')
  }
})
</script>
