import { RouteRecordRaw } from 'vue-router'
import useConversationStore from '@/store/modules/conversation'

const conversationRouters: Array<RouteRecordRaw> = [
  {
    path: '/chat',
    name: 'Chat',
    beforeEnter: async () => {
      const conversationStore = useConversationStore()
      const restored = await conversationStore.restoreCurrentConversation()
      if (restored) {
        return true
      }

      return {
        name: 'Conversation',
      }
    },
    component: () => import('@pages/conversation/chat/index.vue'),
  },
  {
    path: '/singleSetting',
    name: 'SingleSetting',
    component: () => import('@pages/conversation/singleSetting/index.vue'),
  },
  {
    path: '/groupSetting',
    name: 'GroupSetting',
    component: () => import('@pages/conversation/groupSetting/index.vue'),
  },
  {
    path: '/groupManage',
    name: 'GroupManage',
    component: () => import('@pages/conversation/groupManage/index.vue'),
  },
  {
    path: '/changeName',
    name: 'ChangeName',
    props: ({ query }) => ({
      originData: JSON.parse(query.originData as string),
    }),
    component: () => import('@pages/conversation/changeName/index.vue'),
  },
  {
    path: '/broadcastMessage',
    name: 'BroadcastMessage',
    component: () => import('@pages/conversation/broadcastMessage/index.vue'),
  },
  {
    path: '/globalSearch',
    name: 'GlobalSearch',
    component: () => import('@pages/conversation/globalSearch/index.vue'),
  },
  {
    path: '/groupQrCode',
    name: 'GroupQrCode',
    component: () => import('@pages/conversation/groupQrCode/index.vue'),
  },
  {
    path: '/groupAnnouncement',
    name: 'GroupAnnouncement',
    component: () => import('@pages/conversation/groupAnnouncement/index.vue'),
  },
  {
    path: '/groupChatHistory',
    name: 'GroupChatHistory',
    component: () => import('@pages/conversation/groupChatHistory/index.vue'),
  },
  {
    path: '/chatHistory',
    name: 'ChatHistory',
    component: () => import('@pages/conversation/groupChatHistory/index.vue'),
  },
]

export default conversationRouters
