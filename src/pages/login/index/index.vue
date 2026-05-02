<template>
  <div class="page_container relative !bg-white px-10">
    <img class="mx-auto mt-[80px] h-16 w-16" src="@assets/images/logo.png" alt="" />
    <div class="mx-auto text-lg font-semibold text-primary">{{ $t('welcome') }}</div>

    <van-form @submit="onSubmit" class="mt-[60px] flex-1">
      <div class="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-[#f4f7fb] p-1">
        <button
          v-for="item in loginModeOptions"
          :key="item.value"
          type="button"
          class="rounded-lg px-3 py-2 text-sm transition-colors"
          :class="
            loginMode === item.value
              ? 'bg-white font-medium text-primary shadow-sm'
              : 'text-sub-text'
          "
          @click="switchLoginMode(item.value)"
        >
          {{ item.label }}
        </button>
      </div>

      <div v-if="loginMode === 'phone'">
        <div class="mb-1 text-sm text-sub-text">{{ $t('cellphone') }}</div>
        <div class="flex items-center rounded-lg border border-gap-text">
          <div class="flex items-center border-r border-gap-text px-3" @click="showAreaCode = true">
            <span class="mr-1">{{ formData.areaCode }}</span>
            <van-icon name="arrow-down" />
          </div>
          <van-field class="!py-1 !text-base" clearable v-model="formData.phoneNumber" name="phoneNumber" type="number"
            :placeholder="$t('placeholder.inputPhoneNumber')" />
        </div>
      </div>

      <div v-else>
        <div class="mb-1 text-sm text-sub-text">{{ $t('account') }}</div>
        <div class="rounded-lg border border-gap-text">
          <van-field class="!py-1" clearable v-model="formData.account" name="account"
            :placeholder="$t('placeholder.inputAccount')" />
        </div>
      </div>

      <div class="mt-5" v-if="isByPassword">
        <div class="mb-1 text-sm text-sub-text">{{ $t('password') }}</div>
        <div class="rounded-lg border border-gap-text">
          <van-field class="!py-1" clearable v-model="formData.password" name="password" type="password"
            :placeholder="$t('placeholder.inputPassword')" />
        </div>
      </div>

      <div class="mt-5" v-else>
        <div class="mb-1 text-sm text-sub-text">{{ $t('reAcquireDesc') }}</div>
        <div class="rounded-lg border border-gap-text">
          <van-field class="!py-1" clearable v-model="formData.verificationCode" name="verificationCode" type="text"
            :placeholder="$t('placeholder.inputVerificationCode')">
            <template #button>
              <span class="text-primary" @click="reSend" v-if="count <= 0">{{
                $t('buttons.verificationCode')
                }}</span>
              <span class="text-primary" v-else>{{ count }}S</span>
            </template>
          </van-field>
        </div>
      </div>

      <div class="mt-3 flex justify-between" v-if="loginMode !== 'account'">
        <div class="text-xs text-sub-text" @click="getCode(false)">
          {{ $t('forgetPasswordTitle') }}
        </div>
        <div class="text-xs text-primary" @click="isByPassword = !isByPassword">
          {{
            `${isByPassword ? $t('buttons.verificationCodeLogin') : $t('buttons.passwordLogin')}`
          }}
        </div>
      </div>

      <div class="mt-16">
        <van-button :loading="loading" :disabled="!canSubmit" block type="primary" native-type="submit">
          {{ $t('buttons.login') }}
        </van-button>

        <div class="my-4 h-[1px] w-full bg-[#707070] opacity-10"></div>

        <van-button @click="toggleLoginMode" block plain>
          {{ switchLoginModeText }}
        </van-button>
      </div>
    </van-form>

    <div class="mb-[32px] flex w-[300px] flex-col items-center text-xs">
      <div class="flex flex-row text-primary">
        <div class="text-sub-text">{{ $t('notHaveAccount') }}</div>
        <div @click="getCode(true)">{{ $t('nowRegister') }}</div>
      </div>
      <div class="text-sub-text">{{ version }}</div>
    </div>

    <van-popup v-model:show="showAreaCode" round position="bottom">
      <van-picker :columns="countryCode" @cancel="showAreaCode = false" @confirm="onConfirmAreaCode"
        :columns-field-names="{
          text: 'phone_code',
          value: 'phone_code',
          children: 'children',
        }" />
    </van-popup>

  </div>
</template>

<script setup lang="ts">
import md5 from 'md5'
import type { PickerConfirmEventParams } from 'vant'
import { login, sendSms } from '@/api/login'
import countryCode from '@/utils/areaCode'
import { setIMProfile } from '@/utils/storage'
import { UsedFor } from '@/api/data'

const version = process.env.VERSION
type LoginMode = 'phone' | 'account'

const { t } = useI18n()
const router = useRouter()
const getDefaultLoginMode = (): LoginMode => {
  const savedMode = localStorage.getItem('IMLoginMode')
  if (savedMode === 'phone' || savedMode === 'account') {
    return savedMode
  }
  if (localStorage.getItem('IMAccountLogin')) return 'account'
  return 'phone'
}

const formData = reactive({
  phoneNumber: localStorage.getItem('IMPhoneNumber') ?? '',
  account: localStorage.getItem('IMAccountLogin') ?? '',
  areaCode: '+86',
  password: '',
  verificationCode: '',
  accept: true,
})
const loading = ref(false)
const isByPassword = ref(true)
const loginMode = ref<LoginMode>(getDefaultLoginMode())
const showAreaCode = ref(false)
const count = ref(0)
let timer: NodeJS.Timer

const loginModeOptions = computed(() => [
  { label: t('buttons.phoneNumberLogin'), value: 'phone' as LoginMode },
  { label: t('buttons.accountLogin'), value: 'account' as LoginMode },
])

const currentIdentifier = computed(() => {
  if (loginMode.value === 'account') return formData.account
  return formData.phoneNumber
})

const canSubmit = computed(() => {
  if (!currentIdentifier.value) return false
  if (isByPassword.value) return !!formData.password
  return loginMode.value !== 'account' && !!formData.verificationCode
})

const switchLoginModeText = computed(() =>
  loginMode.value === 'phone'
    ? t('buttons.accountLogin')
    : t('buttons.phoneNumberLogin'),
)

const switchLoginMode = (mode: LoginMode) => {
  loginMode.value = mode
  localStorage.setItem('IMLoginMode', mode)
  if (mode === 'account') {
    isByPassword.value = true
    formData.verificationCode = ''
  }
}

const toggleLoginMode = () =>
  switchLoginMode(loginMode.value === 'phone' ? 'account' : 'phone')

const onSubmit = async () => {
  loading.value = true
  localStorage.setItem('IMLoginMode', loginMode.value)
  if (loginMode.value === 'account') {
    localStorage.setItem('IMAccountLogin', formData.account)
  } else {
    localStorage.setItem('IMPhoneNumber', formData.phoneNumber)
  }
  try {
    const {
      data: { chatToken, imToken, userID },
    } = await login({
      phoneNumber: loginMode.value === 'phone' ? formData.phoneNumber : '',
      password: isByPassword.value ? md5(formData.password) : '',
      areaCode: formData.areaCode,
      verifyCode: formData.verificationCode,
      account: loginMode.value === 'account' ? formData.account : '',
    })

    setIMProfile({ chatToken, imToken, userID })
    router.push('/conversation')
  } catch (error) {
    // feedbackToast({ message: t('messageTip.loginFailed'), error })
  }
  loading.value = false
}

const onConfirmAreaCode = ({ selectedValues }: PickerConfirmEventParams) => {
  formData.areaCode = String(selectedValues[0])
  showAreaCode.value = false
}

const reSend = () => {
  if (count.value > 0) return
  sendSms({
    phoneNumber: loginMode.value === 'phone' ? formData.phoneNumber : '',
    areaCode: formData.areaCode,
    usedFor: UsedFor.Login,
  }).then(startTimer)
  // .catch(error => feedbackToast({ message: t('messageTip.sendCodeFailed'), error }))
}

const startTimer = () => {
  if (timer) {
    clearInterval(timer)
  }
  count.value = 60
  timer = setInterval(() => {
    if (count.value > 0) {
      count.value -= 1
    } else {
      clearInterval(timer)
    }
  }, 1000)
}

const getCode = (flag: boolean) => {
  router.push({
    path: 'getCode',
    query: {
      isRegiste: flag + '',
    },
  })
}
</script>

<style lang="scss" scoped>
.page_container {
  background: linear-gradient(180deg,
      rgba(0, 137, 255, 0.1) 0%,
      rgba(255, 255, 255, 0) 100%);
}
</style>
