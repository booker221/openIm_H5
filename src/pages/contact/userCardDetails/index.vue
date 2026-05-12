<template>
  <div class="page_container">
    <NavBar :title="$t('userInfo')" />

    <div class="my-2 mx-2 overflow-hidden rounded-md">
      <DetailInfoItem :lable="$t('avatar')">
        <Avatar
          :size="32"
          :src="contactStore.storeUserCardData.baseInfo?.faceURL"
          :desc="contactStore.storeUserCardData.baseInfo?.nickname"
        />
      </DetailInfoItem>
      <DetailInfoItem
        :lable="$t('name')"
        :content="contactStore.storeUserCardData.baseInfo?.nickname"
      />
      <DetailInfoItem :lable="$t('gender')" :content="comptGenderStr" />
      <DetailInfoItem :lable="$t('birthday')" :content="birthStr" />
    </div>

    <div class="mx-2 overflow-hidden rounded-md">
      <DetailInfoItem
        :lable="$t('cellphone')"
        :content="contactStore.storeUserCardData.baseInfo?.phoneNumber"
      />
      <DetailInfoItem
        :lable="$t('email')"
        :content="contactStore.storeUserCardData.baseInfo?.email"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar/index.vue'
import Avatar from '@/components/Avatar/index.vue'
import DetailInfoItem from '@/components/DetailInfoItem/index.vue'
import dayjs from 'dayjs'
import useContactStore from '@/store/modules/contact'

const { t } = useI18n()
const contactStore = useContactStore()
const router = useRouter()
const route = useRoute()

const comptGenderStr = computed(() => {
  if (contactStore.storeUserCardData.baseInfo?.gender === 1) {
    return t('male')
  }
  if (contactStore.storeUserCardData.baseInfo?.gender === 2) {
    return t('female')
  }
  return t('private')
})
const birthStr = computed(() =>
  contactStore.storeUserCardData.baseInfo?.birth
    ? dayjs(contactStore.storeUserCardData.baseInfo?.birth).format('YYYY-MM-DD')
    : '-',
)

const ensureUserCardData = async () => {
  const sourceID =
    (typeof route.query.sourceID === 'string' ? route.query.sourceID : '') ||
    contactStore.storeUserCardData.baseInfo?.userID
  const groupID =
    (typeof route.query.groupID === 'string' ? route.query.groupID : '') ||
    contactStore.storeUserCardData.groupMemberInfo?.groupID

  if (!sourceID) {
    router.replace('/conversation')
    return
  }

  const needHydrate =
    contactStore.storeUserCardData.baseInfo?.userID !== sourceID ||
    (groupID || contactStore.storeUserCardData.groupMemberInfo?.groupID
      ? contactStore.storeUserCardData.groupMemberInfo?.groupID !== groupID
      : false)

  if (!needHydrate) {
    return
  }

  const restored = await contactStore.hydrateUserCardData(sourceID, groupID)
  if (!restored) {
    router.replace('/conversation')
  }
}

onMounted(() => {
  ensureUserCardData()
})
</script>

<style lang="scss" scoped></style>
