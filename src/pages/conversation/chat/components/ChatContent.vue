<template>
  <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
    <virtual-list
      :class="{ '!flex-col': overflow }"
      ref="vsl"
      class="my_scrollbar min-h-0 flex-1 overflow-y-auto"
      :data-key="'clientMsgID'"
      :data-sources="messageStore.storeHistoryMessageList"
      :topThreshold="120"
      :keeps="20"
      :data-component="
        (message: MessageItem) =>
          checkIsNotification(message) ? SystemNotificationItem : MessageItemVue
      "
      :extra-props="
        (message: MessageItem) => ({
          showCheck: messageStore.storeIsMultiSelectMode,
          isChecked: messageStore.isMessageSelected(message),
          isActive: activeMessageKey === getMessageUniqueKey(message),
          onOpenMenu: openMessageMenu,
          onToggleCheck: toggleMessageSelected,
        })
      "
      :estimate-size="80"
      @totop="onTotop"
      @resized="onItemRendered"
      @scroll="onScoll"
    >
      <template #header>
        <div v-if="overflow && !initLoading" class="pt-2">
          <div class="spinner" v-show="loadState.loading"></div>
          <div class="finished" v-show="!messageStore.storeHistoryMessageHasMore">
            {{ $t('noMore') }}
          </div>
        </div>
      </template>
    </virtual-list>
    <div
      v-show="initLoading"
      class="!absolute top-0 flex h-full w-full items-center justify-center bg-white"
    >
      <van-loading type="spinner" />
    </div>
    <ChatMessageMenu
      :show="showMessageMenu"
      :top="messageMenuTop"
      :items="messageMenuActions"
      @close="closeMessageMenu"
      @select="selectMessageMenu"
    />
  </div>
</template>

<script setup lang="ts">
import useMessageStore from '@/store/modules/message'
import VirtualList from '@components/VirtualList'
import useHistoryMessageList from '../useHistoryMessageList'
import MessageItemVue from './MessageItem/MessageItem.vue'
import SystemNotificationItem from './SystemNotificationItem.vue'
import { MessageItem, MessageType } from '@openim/wasm-client-sdk'
import { TipTypes } from '@/constants/enum'
import ChatMessageMenu from './ChatMessageMenu.vue'
import useChatMessageActions from '../useChatMessageActions'
import { ExMessageItem, getMessageUniqueKey } from '@/store/modules/message'

const emit = defineEmits([])
const { t } = useI18n()

const messageStore = useMessageStore()
const {
  canDeleteMessage,
  canRecallMessage,
  copyMessage,
  enterMultiSelectMode,
  favoriteMessage,
  forwardMessage,
  quoteMessage,
  recallMessage,
  toggleMessageSelected,
  deleteMessage,
} = useChatMessageActions()

const historyMessageState = useHistoryMessageList()
const { onItemRendered, onTotop, onScoll: rawOnScoll } = historyMessageState
const vsl = toRef(historyMessageState, 'vsl')
const overflow = toRef(historyMessageState, 'overflow')
const loadState = toRef(historyMessageState, 'loadState')
const initLoading = toRef(historyMessageState, 'initLoading')
const showMessageMenu = ref(false)
const messageMenuTop = ref(0)
const activeMessage = ref<ExMessageItem>()
const activeMessageKey = computed(() =>
  activeMessage.value ? getMessageUniqueKey(activeMessage.value) : '',
)

const closeMessageMenu = () => {
  showMessageMenu.value = false
  activeMessage.value = undefined
}

const getMenuTop = (event: Event) => {
  const pointerY =
    event instanceof MouseEvent
      ? event.clientY
      : ((event as TouchEvent).touches?.[0] ||
          (event as TouchEvent).changedTouches?.[0])?.clientY ??
        window.innerHeight / 2

  const menuHeight = 92
  const topGap = 12
  let nextTop = pointerY - menuHeight - topGap
  if (nextTop < 12) {
    nextTop = pointerY + topGap
  }
  return Math.min(nextTop, window.innerHeight - menuHeight - 12)
}

const openMessageMenu = (message: ExMessageItem, event: Event) => {
  activeMessage.value = message
  messageMenuTop.value = getMenuTop(event)
  showMessageMenu.value = true
}

const onScoll = (...args: Parameters<typeof rawOnScoll>) => {
  closeMessageMenu()
  rawOnScoll(...args)
}

const messageMenuActions = computed(() => {
  if (!activeMessage.value) return []

  const actions = [
    {
      key: 'copy',
      icon: 'description',
      label: t('messageMenu.copy'),
    },
    {
      key: 'forward',
      icon: 'share-o',
      label: t('messageMenu.forward'),
    },
    {
      key: 'favorite',
      icon: 'star-o',
      label: t('messageMenu.favorite'),
    },
    {
      key: 'reply',
      icon: 'chat-o',
      label: t('messageMenu.replay'),
    },
    {
      key: 'multiple',
      icon: 'passed',
      label: t('messageMenu.multipalChoise'),
    },
  ] as Array<{
    key: 'copy' | 'forward' | 'favorite' | 'reply' | 'multiple' | 'revoke' | 'delete'
    icon: string
    label: string
  }>

  if (canRecallMessage(activeMessage.value)) {
    actions.push({
      key: 'revoke',
      icon: 'replay',
      label: t('messageMenu.revoke'),
    })
  }

  if (canDeleteMessage(activeMessage.value)) {
    actions.push({
      key: 'delete',
      icon: 'delete-o',
      label: t('messageMenu.delete'),
    })
  }

  return actions
})

const selectMessageMenu = async (
  action: 'copy' | 'forward' | 'favorite' | 'reply' | 'multiple' | 'revoke' | 'delete',
) => {
  if (!activeMessage.value) return

  const currentMessage = activeMessage.value
  closeMessageMenu()

  switch (action) {
    case 'copy':
      copyMessage(currentMessage)
      break
    case 'forward':
      forwardMessage(currentMessage)
      break
    case 'favorite':
      await favoriteMessage(currentMessage)
      break
    case 'reply':
      quoteMessage(currentMessage)
      break
    case 'multiple':
      enterMultiSelectMode(currentMessage)
      break
    case 'revoke':
      await recallMessage(currentMessage)
      break
    case 'delete':
      await deleteMessage(currentMessage)
      break
  }
}

const checkIsNotification = computed(() => (message: MessageItem) => {
  if (message.contentType === MessageType.GroupInfoUpdated) {
    let detail
    try {
      detail = JSON.parse(message.notificationElem?.detail!)
    } catch (e) {}
    return detail?.group?.notification === undefined
  }
  return TipTypes.includes(message.contentType)
})

watch(
  () => messageStore.storeIsMultiSelectMode,
  (newVal) => {
    if (newVal) {
      closeMessageMenu()
    }
  },
)
</script>

<style lang="scss" scoped>
.finished {
  font-size: 14px;
  text-align: center;
  color: #bfbfbf;
}

.spinner {
  font-size: 10px;
  margin: 0px auto;
  text-indent: -9999em;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #ffffff;
  background: linear-gradient(to right, #ccc 10%, rgba(255, 255, 255, 0) 42%);
  position: relative;
  animation: load3 1.4s infinite linear;
  transform: translateZ(0);
}

.spinner:before {
  width: 50%;
  height: 50%;
  background: #ccc;
  border-radius: 100% 0 0 0;
  position: absolute;
  top: 0;
  left: 0;
  content: '';
}

.spinner:after {
  background: #ffffff;
  width: 75%;
  height: 75%;
  border-radius: 50%;
  content: '';
  margin: auto;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}

@-webkit-keyframes load3 {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

@keyframes load3 {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.group_announcement_tab {
  display: flex;
  position: absolute;
  top: 6px;
  z-index: 10;
  flex-direction: column;
  align-items: flex-start;
  width: 90%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #f2f8ff;
  padding: 8px 12px;
  border-radius: 6px;
}
</style>
