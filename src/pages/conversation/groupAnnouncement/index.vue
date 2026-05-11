<template>
  <div class="page_container !bg-white">
    <NavBar :title="$t('popover.groupAnnouncement')">
      <span
        v-if="canEdit"
        class="text-sm font-medium text-primary"
        @click="saveAnnouncement"
      >
        {{ $t('buttons.save') }}
      </span>
    </NavBar>

    <div class="flex-1 overflow-y-auto px-5 pb-8 pt-6">
      <div class="rounded-[10px] bg-[#F8F9FA] p-4">
        <van-field
          v-model="announcement"
          type="textarea"
          rows="6"
          autosize
          :readonly="!canEdit"
          :maxlength="1000"
          :placeholder="$t('placeholder.groupNoticePlaceholder')"
          input-align="left"
          class="group-notice-field"
        />
        <div
          v-if="!canEdit && !announcement.trim()"
          class="pt-2 text-sm text-sub-text"
        >
          {{ $t('emptyGroupAnnouncement') }}
        </div>
      </div>

      <div v-if="canEdit" class="mt-4 overflow-hidden rounded-[10px] bg-white">
        <SettingRowItem
          :title="$t('checks.pin')"
          :checked="isPinned"
          show-switch
          @update-value="updatePinned"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar/index.vue'
import SettingRowItem from '@/components/SettingRowItem/index.vue'
import useConversationStore from '@/store/modules/conversation'
import useCurrentMemberRole from '@/hooks/useCurrentMemberRole'
import { IMSDK } from '@/utils/imCommon'
import { feedbackToast } from '@/utils/common'
import {
  buildMergedGroupExtra,
  isGroupAnnouncementPinned,
} from '@/utils/groupExtra'
import type { GroupItem } from '@openim/wasm-client-sdk/lib/types/entity'

const router = useRouter()
const { t } = useI18n()
const conversationStore = useConversationStore()
const { isOwner, isAdmin } = useCurrentMemberRole()

const canEdit = computed(() => isOwner.value || isAdmin.value)
const announcement = ref(conversationStore.storeCurrentGroupInfo.notification ?? '')
const isPinned = ref(
  isGroupAnnouncementPinned(conversationStore.storeCurrentGroupInfo),
)

const syncCurrentGroupInfo = (patch: Partial<GroupItem>) => {
  conversationStore.updateCurrentGroupInfo({
    ...conversationStore.storeCurrentGroupInfo,
    ...patch,
  })
}

const updatePinned = async (checked: boolean) => {
  isPinned.value = checked

  if (!canEdit.value) {
    return
  }

  const ex = buildMergedGroupExtra(
    conversationStore.storeCurrentGroupInfo.ex,
    { isTop: checked },
  )

  try {
    await IMSDK.setGroupInfo({
      groupID: conversationStore.storeCurrentGroupInfo.groupID,
      ex,
    })
    syncCurrentGroupInfo({ ex })
  } catch (error) {
    isPinned.value = !checked
    feedbackToast({ error, message: t('messageTip.nomalFailed') })
  }
}

const saveAnnouncement = async () => {
  const value = announcement.value.trim()
  if (!value) {
    feedbackToast({ message: t('messageTip.inputEmpty'), error: true })
    return
  }

  const ex = buildMergedGroupExtra(
    conversationStore.storeCurrentGroupInfo.ex,
    { isTop: isPinned.value },
  )

  try {
    await IMSDK.setGroupInfo({
      groupID: conversationStore.storeCurrentGroupInfo.groupID,
      notification: value,
      ex,
    })
    syncCurrentGroupInfo({
      notification: value,
      ex,
      notificationUpdateTime: Date.now(),
    })
    feedbackToast({ message: t('messageTip.nomalSuccess') })
    router.back()
  } catch (error) {
    feedbackToast({ error, message: t('messageTip.nomalFailed') })
  }
}

watch(
  () => conversationStore.storeCurrentGroupInfo,
  (groupInfo) => {
    announcement.value = groupInfo.notification ?? ''
    isPinned.value = isGroupAnnouncementPinned(groupInfo)
  },
  {
    deep: true,
    immediate: true,
  },
)

onMounted(async () => {
  if (!conversationStore.storeCurrentConversation.conversationID) {
    const restored = await conversationStore.restoreCurrentConversation()
    if (!restored) {
      router.replace('/conversation')
      return
    }
  }

  if (!conversationStore.storeCurrentConversation.groupID) {
    router.replace('/conversation')
    return
  }

  conversationStore.getCurrentGroupInfoFromReq()
})
</script>

<style lang="scss" scoped>
:deep(.group-notice-field) {
  padding: 0;
  background: transparent;
}

:deep(.group-notice-field .van-field__body),
:deep(.group-notice-field .van-field__control) {
  font-size: 15px;
  line-height: 1.7;
  color: #0c1c33;
}
</style>
