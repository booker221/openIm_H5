<template>
  <div class="page_container relative px-10">
    <img class="mt-[5vh] h-6 w-6" :src="login_back" alt="" @click="$router.back" />

    <div class="my-12 text-2xl font-semibold text-primary">{{ $t('register') }}</div>

    <van-form @submit="onSubmit">
      <div>
        <div class="mb-1 text-sm text-sub-text">{{ $t('cellphone') }}</div>
        <div class="flex items-center rounded-lg border border-gap-text">
          <div
            class="flex items-center border-r border-gap-text px-3"
            @click="showAreaCode = true"
          >
            <span class="mr-1">{{ formData.areaCode }}</span>
            <van-icon name="arrow-down" />
          </div>
          <van-field
            class="!py-1 !text-base"
            clearable
            v-model="formData.phoneNumber"
            name="phoneNumber"
            type="number"
            :placeholder="$t('placeholder.inputPhoneNumber')"
          />
        </div>
      </div>

      <div class="mt-28">
        <van-button :loading="loading" block type="primary" native-type="submit">
          {{ $t('buttons.next') }}
        </van-button>
      </div>
    </van-form>

    <van-popup v-model:show="showAreaCode" round position="bottom">
      <van-picker
        :columns="countryCode"
        @cancel="showAreaCode = false"
        @confirm="onConfirmAreaCode"
        :columns-field-names="{
          text: 'phone_code',
          value: 'phone_code',
          children: 'children',
        }"
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import type { PickerConfirmEventParams } from 'vant'
import { UsedFor } from '@/api/data'
import { sendSms } from '@/api/login'
import countryCode from '@/utils/areaCode'
import { feedbackToast } from '@/utils/common'
import login_back from '@assets/images/login_back.png'

const phoneRegExp = /^1[3-9]\d{9}$/
const { t } = useI18n()
const router = useRouter()

const formData = reactive({
  phoneNumber: '',
  areaCode: '+86',
  invitationCode: '',
  accept: true,
})
const showAreaCode = ref(false)
const loading = ref(false)

const onSubmit = async () => {
  if (!phoneRegExp.test(formData.phoneNumber)) {
    feedbackToast({
      message: t('messageTip.correctPhoneNumber'),
      error: t('messageTip.correctPhoneNumber'),
    })
    return
  }
  loading.value = true
  try {
    await sendSms({
      phoneNumber: formData.phoneNumber,
      areaCode: formData.areaCode,
      usedFor: UsedFor.Register,
      invitationCode: formData.invitationCode,
    })
    router.push({
      path: 'verifyCode',
      query: {
        baseData: JSON.stringify(formData),
      },
    })
  } finally {
    loading.value = false
  }
}

const onConfirmAreaCode = ({ selectedValues }: PickerConfirmEventParams) => {
  formData.areaCode = String(selectedValues[0])
  showAreaCode.value = false
}
</script>

<style lang="scss" scoped>
.page_container {
  background: linear-gradient(
    180deg,
    rgba(0, 137, 255, 0.1) 0%,
    rgba(255, 255, 255, 0) 100%
  );
}
</style>
