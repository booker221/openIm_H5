<template>
  <van-nav-bar
    :class="{ chat_header_multi: messageStore.storeIsMultiSelectMode }"
    :style="messageStore.storeIsMultiSelectMode ? { background: '#0089FF' } : {}"
    placeholder
    fixed
    left-arrow
    :clickable="false"
    :border="false"
    @click-left="back"
  >
    <template #left>
      <img
        v-if="!messageStore.storeIsMultiSelectMode"
        class="mr-4 h-[23px] min-w-[23px]"
        :src="arrows_left"
        alt=""
      />
      <van-icon
        v-else
        class="mr-2 text-white"
        name="cross"
        size="22"
      />
    </template>
    <template #title>
      <div class="flex h-full flex-col justify-evenly">
        <div class="flex items-center justify-center">
          <span v-if="!messageStore.storeIsMultiSelectMode" class="flex-1 truncate">{{
            conversationStore.storeCurrentConversation.showName
          }}</span>
          <span v-else class="flex-1 truncate text-white">
            {{ $t('selected') }} {{ messageStore.storeSelectedMessages.length }}
          </span>
          <span v-if="!messageStore.storeIsMultiSelectMode">{{ titleSuffix }}</span>
        </div>
      </div>
    </template>
    <template #right>
      <div v-if="messageStore.storeIsMultiSelectMode" class="flex items-center gap-3 text-white">
        <van-icon class="action_icon" name="share-o" size="20" @click="forwardSelectedMessages" />
        <van-icon class="action_icon" name="delete-o" size="20" @click="deleteSelectedMessages" />
        <van-icon
          class="action_icon"
          :name="allSelected ? 'passed' : 'apps-o'"
          size="20"
          @click="selectAllMessages"
        />
        <span class="sr-only">
          {{ allSelected ? $t('buttons.cancel') : $t('buttons.selectAll') }}
        </span>
      </div>
      <img v-else class="h-[23px] min-w-[23px]" :src="more" alt="" @click="toSetting" />
    </template>
  </van-nav-bar>
</template>

<script setup lang="ts">
import arrows_left from '@/assets/images/chatHeader/arrows_left.png'
import more from '@/assets/images/chatHeader/more.png'
import useConversationStore from '@/store/modules/conversation'
import useMessageStore from '@/store/modules/message'
import useChatMessageActions from '../useChatMessageActions'
import { SessionType } from '@openim/wasm-client-sdk'

const router = useRouter()
const conversationStore = useConversationStore()
const messageStore = useMessageStore()
const { deleteSelectedMessages, exitMultiSelectMode, forwardSelectedMessages, selectAllMessages } =
  useChatMessageActions()

const isSingle = computed(
  () =>
    conversationStore.storeCurrentConversation.conversationType === SessionType.Single,
)
const isNotification = computed(
  () =>
    conversationStore.storeCurrentConversation.conversationType ===
    SessionType.Notification,
)
const titleSuffix = computed(() => {
  let suffix = ''
  if (!isNotification.value && !isSingle.value) {
    suffix = `(${conversationStore.storeCurrentGroupInfo.memberCount || 0})`
  }
  return suffix
})
const allSelected = computed(
  () =>
    messageStore.storeSelectedMessages.length ===
      messageStore.storeHistoryMessageList.length &&
    messageStore.storeHistoryMessageList.length > 0,
)

const back = () => {
  if (messageStore.storeIsMultiSelectMode) {
    exitMultiSelectMode()
    return
  }
  router.push('conversation')
}

const toSetting = () => {
  router.push(isSingle.value ? 'singleSetting' : 'groupSetting')
}
</script>

<style lang="scss" scoped>
:deep(.van-nav-bar__title) {
  height: 100%;
}

:deep(.van-nav-bar) {
  border-bottom: 1px solid #e8eaef;
}

:deep(.van-nav-bar__left),
:deep(.van-nav-bar__right) {
  min-width: 56px;
}

.action_icon {
  min-width: 20px;
  flex-shrink: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

</style>
