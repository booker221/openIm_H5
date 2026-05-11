<template>
  <div class="page_container">
    <NavBar :title="$t('friendSettings')" />

    <div class="my-2 mx-2 overflow-hidden rounded-md">
      <CardDescItem
        :lable="$t('setNickname')"
        arrow
        @click="toChangeName"
        v-if="isFriendUser"
      />
      <CardDescItem
        v-if="isFriendUser"
        :lable="$t('shareFriend')"
        arrow
        @click="toShareFriend"
      />
    </div>

    <div class="mx-2 mb-2 overflow-hidden rounded-md">
      <CardDescItem :lable="$t('checks.addToBlack')" arrow>
        <van-switch
          size="20"
          :loading="toggleBlackLoading"
          :model-value="comptIsBlack"
          @update:model-value="toggleBlack"
        />
      </CardDescItem>
    </div>

    <div v-if="isFriendUser" class="mx-2 rounded-md">
      <van-button
        class="w-full !border-0 !text-base !text-error-text"
        plain
        type="default"
        :text="$t('unfriend')"
        @click="tryRemoveFriend"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar/index.vue'
import CardDescItem from '@/components/CardDescItem/index.vue'
import useContactStore from '@/store/modules/contact'
import useConversationStore from '@/store/modules/conversation'
import useUserStore from '@/store/modules/user'
import { IMSDK } from '@/utils/imCommon'
import { feedbackToast } from '@/utils/common'
import { showConfirmDialog } from 'vant'
import { ContactChooseEnum } from '../chooseUser/data'

const { t } = useI18n()
const router = useRouter()
const contactStore = useContactStore()
const conversationStore = useConversationStore()
const userStore = useUserStore()

const isFriendUser = computed(() => !!contactStore.storeUserCardData.friendInfo)

const comptIsBlack = computed(
  () =>
    contactStore.storeBlackList.findIndex(
      (user) => user.userID === contactStore.storeUserCardData.baseInfo?.userID,
    ) > -1,
)
const toggleBlackLoading = ref(false)
const toggleBlack = (newValue: boolean) => {
  toggleBlackLoading.value = true
  if (newValue) {
    IMSDK.addBlack({
      toUserID: contactStore.storeUserCardData.baseInfo?.userID!,
      ex: '',
    })
      .catch((error) => feedbackToast({ error }))
      .finally(() => (toggleBlackLoading.value = false))
    return
  }
  IMSDK.removeBlack(contactStore.storeUserCardData.baseInfo?.userID!)
    .catch((error) => feedbackToast({ error }))
    .finally(() => (toggleBlackLoading.value = false))
}

const toChangeName = () => {
  router.push({
    path: '/changeNameOrRemark',
    query: {
      friendInfo: JSON.stringify(contactStore.storeUserCardData.friendInfo),
    },
  })
}

const toShareFriend = () => {
  const userInfo = contactStore.storeUserCardData.baseInfo
  if (!userInfo?.userID) return

  router.push({
    path: '/chooseUser',
    state: {
      chooseType: ContactChooseEnum.ShareCard,
      extraData: JSON.stringify({
        userID: userInfo.userID,
        nickname: userInfo.nickname,
        faceURL: userInfo.faceURL,
      }),
    },
  })
}

const tryRemoveFriend = () => {
  showConfirmDialog({
    message: t('messageTip.unfriend'),
    beforeClose: (action) =>
      new Promise((resolve) => {
        if (action === 'confirm') {
          const friendUserID = contactStore.storeUserCardData.baseInfo?.userID!
          const sortedUserIDs = [userStore.storeSelfInfo.userID, friendUserID].sort(
            (left, right) => (left > right ? 1 : -1),
          )
          const conversationID = `si_${sortedUserIDs.join('_')}`

          IMSDK.deleteFriend(friendUserID)
            .then(async () => {
              contactStore.updateUserCardFriendInfo(undefined)
              conversationStore.updateConversationList(
                conversationStore.storeConversationList.filter(
                  (item) => item.conversationID !== conversationID,
                ),
              )
              await IMSDK.deleteConversationAndDeleteAllMsg(conversationID).catch(
                () => undefined,
              )
              router.back()
            })
            .catch((error) => feedbackToast({ error }))
            .finally(() => resolve(true))
        } else {
          resolve(true)
        }
      }),
  })
}
</script>

<style lang="scss" scoped></style>
