<template>
  <div class="page_container">
    <NavBar :title="$t('broadcastMessage')">
      <span
        class="text-sm"
        :class="sendEnabled ? 'text-primary' : 'text-sub-text'"
        @click="sendBroadcastMessage"
      >
        {{ sending ? $t('broadcastSending') : $t('buttons.send') }}
      </span>
    </NavBar>

    <div class="flex-1 overflow-hidden">
      <van-search
        v-model="keyword"
        :placeholder="$t('placeholder.search')"
        class="van-search_no_b"
      />

      <div class="border-b border-[#E8EAEF] bg-white px-[22px] py-3">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-[#0C1C33]">
            {{ $t('messageRecipientList') }}
          </div>
          <div class="text-xs text-sub-text">
            {{
              $t('contactSelectedCount', {
                count: selectedRecipients.length,
              })
            }}
          </div>
        </div>

        <div v-if="selectedRecipients.length" class="mt-3 flex flex-wrap gap-2">
          <div
            v-for="recipient in selectedRecipients"
            :key="recipient.key"
            class="flex items-center rounded-full bg-[#F2F8FF] px-3 py-1 text-xs text-primary"
          >
            <span class="max-w-[140px] truncate">{{ recipient.name }}</span>
            <van-icon class="ml-1" name="cross" size="12" @click="removeRecipient(recipient)" />
          </div>
        </div>

        <div class="mt-3 flex gap-3">
          <van-button class="!flex-1" size="small" plain type="primary" @click="selectAllVisible">
            {{ $t('buttons.selectAll') }}
          </van-button>
          <van-button class="!flex-1" size="small" plain type="primary" @click="clearSelection">
            {{ $t('buttons.clear') }}
          </van-button>
        </div>
      </div>

      <div class="flex h-full flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto bg-white pb-[190px]">
          <div class="px-[22px] pt-4 text-xs font-medium text-sub-text">
            {{ $t('contactMenu.myGoodFriend') }}
          </div>
          <div
            v-for="friend in filteredFriendList"
            :key="friend.userID"
            class="flex items-center px-[22px] py-3"
            @click="toggleFriend(friend.userID)"
          >
            <Avatar :src="friend.faceURL" :desc="friend.nickname" :size="42" />
            <div class="ml-3 min-w-0 flex-1 border-b border-[#F1F1F1] py-2">
              <div class="truncate text-sm text-[#0C1C33]">
                {{ friend.remark || friend.nickname || friend.userID }}
              </div>
              <div class="mt-1 truncate text-xs text-sub-text">{{ friend.userID }}</div>
            </div>
            <van-icon
              :name="selectedUserIDs.includes(friend.userID) ? 'checked' : 'circle'"
              :color="selectedUserIDs.includes(friend.userID) ? '#1D6BED' : '#979797'"
              size="20"
            />
          </div>

          <div class="px-[22px] pt-4 text-xs font-medium text-sub-text">
            {{ $t('contactMenu.myGroup') }}
          </div>
          <div
            v-for="group in filteredGroupList"
            :key="group.groupID"
            class="flex items-center px-[22px] py-3"
            @click="toggleGroup(group.groupID)"
          >
            <Avatar
              :src="group.faceURL"
              :desc="group.groupName"
              :size="42"
              is-group
            />
            <div class="ml-3 min-w-0 flex-1 border-b border-[#F1F1F1] py-2">
              <div class="truncate text-sm text-[#0C1C33]">
                {{ group.groupName || group.groupID }}
              </div>
              <div class="mt-1 truncate text-xs text-sub-text">{{ group.groupID }}</div>
            </div>
            <van-icon
              :name="selectedGroupIDs.includes(group.groupID) ? 'checked' : 'circle'"
              :color="selectedGroupIDs.includes(group.groupID) ? '#1D6BED' : '#979797'"
              size="20"
            />
          </div>
        </div>

        <div
          class="fixed bottom-0 left-0 right-0 border-t border-[#E8EAEF] bg-white px-[22px] pb-[max(20px,env(safe-area-inset-bottom))] pt-4"
        >
          <div class="mb-2 text-sm font-medium text-[#0C1C33]">
            {{ $t('broadcastMessageContent') }}
          </div>
          <van-field
            v-model="messageText"
            type="textarea"
            rows="4"
            autosize
            maxlength="500"
            :placeholder="$t('placeholder.typingMessage')"
            show-word-limit
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Avatar from '@/components/Avatar/index.vue'
import NavBar from '@/components/NavBar/index.vue'
import useSendMessage from '@/hooks/useSendMessage'
import useContactStore from '@/store/modules/contact'
import { feedbackToast } from '@/utils/common'
import { IMSDK } from '@/utils/imCommon'
import type { FriendUserItem, GroupItem } from '@openim/wasm-client-sdk/lib/types/entity'

type SelectedRecipient = {
  key: string
  name: string
  type: 'friend' | 'group'
}

const { t } = useI18n()
const router = useRouter()
const contactStore = useContactStore()
const { sendMessage } = useSendMessage()

const keyword = ref('')
const messageText = ref('')
const sending = ref(false)
const selectedUserIDs = ref<string[]>([])
const selectedGroupIDs = ref<string[]>([])

const friendList = computed(() => contactStore.storeFriendList)
const groupList = computed(() => contactStore.storeGroupList)

const filteredFriendList = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  if (!search) return friendList.value

  return friendList.value.filter((friend) =>
    [friend.remark, friend.nickname, friend.userID]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(search)),
  )
})

const filteredGroupList = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  if (!search) return groupList.value

  return groupList.value.filter((group) =>
    [group.groupName, group.groupID]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(search)),
  )
})

const selectedRecipients = computed<SelectedRecipient[]>(() => {
  const users = selectedUserIDs.value
    .map((userID) => friendList.value.find((friend) => friend.userID === userID))
    .filter(Boolean)
    .map((friend) => ({
      key: `friend_${friend!.userID}`,
      name: friend!.remark || friend!.nickname || friend!.userID,
      type: 'friend' as const,
    }))

  const groups = selectedGroupIDs.value
    .map((groupID) => groupList.value.find((group) => group.groupID === groupID))
    .filter(Boolean)
    .map((group) => ({
      key: `group_${group!.groupID}`,
      name: group!.groupName || group!.groupID,
      type: 'group' as const,
    }))

  return [...users, ...groups]
})

const sendEnabled = computed(
  () =>
    !sending.value &&
    selectedRecipients.value.length > 0 &&
    !!messageText.value.trim(),
)

const toggleValueInList = (list: string[], value: string) => {
  if (list.includes(value)) {
    return list.filter((item) => item !== value)
  }
  return [...list, value]
}

const toggleFriend = (userID: string) => {
  selectedUserIDs.value = toggleValueInList(selectedUserIDs.value, userID)
}

const toggleGroup = (groupID: string) => {
  selectedGroupIDs.value = toggleValueInList(selectedGroupIDs.value, groupID)
}

const removeRecipient = (recipient: SelectedRecipient) => {
  if (recipient.type === 'friend') {
    selectedUserIDs.value = selectedUserIDs.value.filter(
      (userID) => `friend_${userID}` !== recipient.key,
    )
    return
  }

  selectedGroupIDs.value = selectedGroupIDs.value.filter(
    (groupID) => `group_${groupID}` !== recipient.key,
  )
}

const selectAllVisible = () => {
  selectedUserIDs.value = Array.from(
    new Set([...selectedUserIDs.value, ...filteredFriendList.value.map((item) => item.userID)]),
  )
  selectedGroupIDs.value = Array.from(
    new Set([...selectedGroupIDs.value, ...filteredGroupList.value.map((item) => item.groupID)]),
  )
}

const clearSelection = () => {
  selectedUserIDs.value = []
  selectedGroupIDs.value = []
}

const ensureContactData = async () => {
  const tasks: Promise<unknown>[] = []

  if (!contactStore.storeFriendList.length) {
    tasks.push(contactStore.getFriendListFromReq())
  }

  if (!contactStore.storeGroupList.length) {
    tasks.push(contactStore.getGroupListFromReq())
  }

  await Promise.all(tasks)
}

const createAndSendTextMessage = async ({
  recvID,
  groupID,
}: {
  recvID?: string
  groupID?: string
}) => {
  const { data: message } = await IMSDK.createTextMessage(messageText.value.trim())
  await sendMessage({
    recvID,
    groupID,
    message,
    needOpreateMessage: false,
  })
}

const sendToUsers = async (users: FriendUserItem[]) => {
  for (const friend of users) {
    await createAndSendTextMessage({
      recvID: friend.userID,
    })
  }
}

const sendToGroups = async (groups: GroupItem[]) => {
  for (const group of groups) {
    await createAndSendTextMessage({
      groupID: group.groupID,
    })
  }
}

const sendBroadcastMessage = async () => {
  if (!selectedRecipients.value.length) {
    feedbackToast({ message: t('messageTip.broadcastTargetEmpty'), error: true })
    return
  }

  if (!messageText.value.trim()) {
    feedbackToast({ message: t('messageTip.broadcastContentEmpty'), error: true })
    return
  }

  if (sending.value) return

  sending.value = true

  const selectedFriends = friendList.value.filter((friend) =>
    selectedUserIDs.value.includes(friend.userID),
  )
  const selectedGroups = groupList.value.filter((group) =>
    selectedGroupIDs.value.includes(group.groupID),
  )

  let successCount = 0
  let failedCount = 0

  try {
    for (const friend of selectedFriends) {
      try {
        await sendToUsers([friend])
        successCount += 1
      } catch (error) {
        failedCount += 1
      }
    }

    for (const group of selectedGroups) {
      try {
        await sendToGroups([group])
        successCount += 1
      } catch (error) {
        failedCount += 1
      }
    }

    if (failedCount > 0) {
      feedbackToast({
        message: t('messageTip.broadcastPartialSuccess', {
          success: successCount,
          failed: failedCount,
        }),
        error: true,
      })
      return
    }

    feedbackToast({
      message: t('messageTip.broadcastAllSuccess', {
        count: successCount,
      }),
    })
    clearSelection()
    messageText.value = ''
    router.back()
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  ensureContactData()
})
</script>
