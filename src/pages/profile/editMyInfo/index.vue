<template>
  <div class="page_container !bg-white">
    <NavBar :title="pageTitle">
      <span @click="saveChange">{{ t('buttons.save') }}</span>
    </NavBar>

    <div class="mx-6 mt-10">
      <div class="rounded-lg border border-gap-text">
        <van-field
          v-model="value"
          class="!py-1"
          label=""
          :maxlength="maxLength"
          :placeholder="placeholder"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar/index.vue'
import { updateBusinessInfo } from '@/api/user'
import useUserStore from '@/store/modules/user'
import { feedbackToast } from '@/utils/common'

type EditField = 'email'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const userStore = useUserStore()

const field = computed<EditField>(() => {
  return route.query.field === 'email' ? 'email' : 'email'
})

const maxLength = computed(() => {
  const rawValue = Number(route.query.maxLength)
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 30
})

const pageTitle = computed(() => {
  switch (field.value) {
    case 'email':
      return t('email')
  }
})

const placeholder = computed(() => {
  switch (field.value) {
    case 'email':
      return t('placeholder.inputEmail')
  }
})

const defaultValue = computed(() => {
  switch (field.value) {
    case 'email':
      return userStore.storeSelfInfo.email ?? ''
  }
})

const value = ref(defaultValue.value)

const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const saveChange = async () => {
  const trimmedValue = value.value.trim()

  if (field.value === 'email') {
    if (!trimmedValue) {
      feedbackToast({
        message: t('placeholder.inputEmail'),
        error: t('placeholder.inputEmail'),
      })
      return
    }

    if (!isEmailValid(trimmedValue)) {
      feedbackToast({
        message: t('messageTip.correctEmail'),
        error: t('messageTip.correctEmail'),
      })
      return
    }
  }

  try {
    switch (field.value) {
      case 'email':
        await updateBusinessInfo({
          email: trimmedValue,
        })
        break
    }

    await userStore.getSelfInfoFromReq()
    feedbackToast({
      message: t('messageTip.nomalSuccess'),
      onClose: () => router.back(),
    })
  } catch (error) {
    feedbackToast({
      message: t('messageTip.updateSelfInfoFailed'),
      error,
    })
  }
}
</script>

<style lang="scss" scoped></style>
