<template>
  <div class="shrink-0">
    <div v-if="getPlaceholder.length > 0" class="flex h-[54px] items-center justify-center bg-[#F0F2F6]">
      <span class="text-sm text-[#8E9AB0]">{{ getPlaceholder }}</span>
    </div>
    <div v-else class="bg-[#F0F2F6] px-3 pb-3 pt-2">
      <div v-if="quoteMessage" class="mb-2 flex items-start rounded-[10px] bg-white px-3 py-2">
        <div class="min-w-0 flex-1 border-l-[3px] border-[#0089FF] pl-2">
          <div class="mb-1 text-xs text-[#0089FF]">
            {{ quoteMessage.senderNickname || $t('messageDescription.quoteMessage') }}
          </div>
          <div class="truncate text-xs text-[#8E9AB0]">
            {{ quotePreview }}
          </div>
        </div>
        <van-icon class="ml-2 mt-0.5 text-[#8E9AB0]" name="cross" @click="messageStore.clearQuoteMessage()" />
      </div>
      <div id="chat_footer" class="flex items-center">
        <div class="flex-grow">
          <CustomEdit class="bg-[#fff]" ref="inputRef"
            @focus="onFocusUpdate(true)" @blur="onFocusUpdate(false)" v-model:input="messageContent"
            :placeholder="$t('placeholder.pleaseInput')" @trigger-at="() => { }" />
        </div>
        <img @click="clickEmojiBtn" class="ml-3 h-[26px] min-w-[26px]" :src="showEmojiBar ? keyboard : emoji"
          alt="emoji" />
        <img v-show="!messageContent" @click="clickAddBtn" class="ml-3 h-[26px] min-w-[26px]" :src="add" alt="" />
        <img v-show="messageContent" @click="switchTextMessage" class="ml-3 h-[26px] min-w-[26px]" :src="send"
          alt="send" />
      </div>
    </div>
    <EmojiPickerPanel v-show="showEmojiBar" :visible="showEmojiBar" @select="handleSelectEmoji" />
    <ChatFooterAction v-show="showActionBar" @closeActionBar="closeActionBar" @getFile="getFile" />
  </div>
</template>

<script setup lang="ts">
import add from '@/assets/images/chatFooter/add.png'
import emoji from '@/assets/images/chatFooter/emoji.png'
import keyboard from '@/assets/images/chatFooter/keyboard.png'
import send from '@/assets/images/chatFooter/send.png'

import CustomEdit from '@/components/CustomEdit/index.vue'
import ChatFooterAction from './ChatFooterAction.vue'
import EmojiPickerPanel from './EmojiPickerPanel.vue'
import {
  GroupMemberRole,
  GroupStatus,
  MessageType,
  SessionType,
} from '@openim/wasm-client-sdk'
import { UploaderFileListItem } from 'vant'
import useSendMessage from '@/hooks/useSendMessage'
import useConversationStore from '@/store/modules/conversation'
import useContactStore from '@/store/modules/contact'
import useMessageStore from '@/store/modules/message'
import { feedbackToast } from '@/utils/common'
import emitter from '@/utils/events'
import { checkIsSafari } from '@/utils/common'
import useCreateNomalMessage from './useCreateNomalMessage'
import useCreateFileMessage from './useCreateFileMessage'
import { getMessagePreviewText } from '../MessageItem/messageUtils'

const { t } = useI18n()
const conversationStore = useConversationStore()
const contactStore = useContactStore()
const messageStore = useMessageStore()
const { createFileMessage } = useCreateFileMessage()

// message
const messageContent = ref('')
const inputRef = ref()
const showActionBar = ref(false)
const showEmojiBar = ref(false)

const { switchNomalMessage } = useCreateNomalMessage({
  messageContent,
})
const { sendMessage } = useSendMessage()
const quoteMessage = computed(() => messageStore.storeQuoteMessage)
const quotePreview = computed(() =>
  quoteMessage.value ? getMessagePreviewText(quoteMessage.value) : '',
)

const isSingle = computed(
  () =>
    conversationStore.storeCurrentConversation.conversationType === SessionType.Single,
)

const getPlaceholder = computed(() => {
  const isMutedAll = conversationStore.currentGroupInfo.status === GroupStatus.Muted
  const roleLevel = conversationStore.storeCurrentMemberInGroup?.roleLevel
  if (!isSingle.value && isMutedAll) {
    return roleLevel !== GroupMemberRole.Normal ? '' : t('placeholder.allMuted')
  }

  const isDismissed =
    conversationStore.currentGroupInfo.status === GroupStatus.Dismissed
  if (!isSingle.value && isDismissed) {
    return t('placeholder.leaveGroup')
  }

  if (!isSingle.value && !conversationStore.currentMemberInGroup?.roleLevel) {
    return t('placeholder.leaveGroup')
  }

  const isBlack = contactStore.storeBlackList.find(
    (black) => black.userID === conversationStore.storeCurrentConversation.userID,
  )
  if (isSingle.value && isBlack) {
    return t('placeholder.beBlack')
  }

  return ''
})

const onFocusUpdate = (isFocus: boolean) => {
  if (isFocus) {
    showActionBar.value = false
    showEmojiBar.value = false
  }

  if (!checkIsSafari()) {
    return
  }
  setTimeout(() => emitter.emit('KEYBOARD_UPDATE'), 100)
  if (isFocus) {
    setTimeout(() => window.scroll(0, 0), 101)
  }
}

const switchTextMessage = async () => {
  const message = await switchNomalMessage()
  if (message) {
    sendMessage({ message })
    messageStore.clearQuoteMessage()
  }
  resetState()
}

const resetState = () => {
  messageContent.value = ''
  inputRef.value.clear()
}


const closeActionBar = () => {
  showActionBar.value = false
}
const clickAddBtn = () => {
  if (showEmojiBar.value) {
    showEmojiBar.value = false
  }
  showActionBar.value = !showActionBar.value
}

const clickEmojiBtn = async () => {
  showActionBar.value = false
  showEmojiBar.value = !showEmojiBar.value

  if (showEmojiBar.value) {
    inputRef.value?.inputRef?.blur()
    return
  }

  await nextTick()
  inputRef.value?.focusAtEnd?.()
}

const handleSelectEmoji = (emojiText: string) => {
  inputRef.value?.insertAtCursor?.([document.createTextNode(emojiText)])
}

const getFile = async (
  uploadData: UploaderFileListItem,
  messageType: MessageType,
) => {
  if (!uploadData.file) {
    feedbackToast({
      error: new Error('file missing'),
    })
    return
  }
  const { error, message } = await createFileMessage(
    uploadData.file,
    messageType,
  )
  if (error || !message) {
    feedbackToast({ error, message: error })
    return
  }
  sendMessage({
    message,
  })
}

onMounted(() => {
  if (!inputRef.value) return
  inputRef.value.focusAtEnd?.()
})

onActivated(() => {
  if (!inputRef.value) return
  resetState()
  showActionBar.value = false
  showEmojiBar.value = false
  inputRef.value.focusAtEnd?.()
})

watch(
  () => messageStore.storeQuoteMessage?.clientMsgID,
  async (newVal) => {
    if (!newVal) return
    await nextTick()
    inputRef.value?.focusAtEnd?.()
  },
)
</script>

<style lang="scss" scoped>
:deep(.van-button__content) {
  width: max-content;
}
</style>
