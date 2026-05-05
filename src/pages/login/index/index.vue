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
          <van-field
            class="!py-1"
            clearable
            v-model="formData.account"
            name="account"
            :placeholder="$t('placeholder.inputAccount')"
          />
        </div>
      </div>

      <div class="mt-5">
        <div class="mb-1 text-sm text-sub-text">{{ $t('password') }}</div>
        <div class="rounded-lg border border-gap-text">
          <van-field
            class="!py-1"
            clearable
            v-model="formData.password"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            :right-icon="showPassword ? 'eye-o' : 'closed-eye'"
            :placeholder="$t('placeholder.inputPassword')"
            @click-right-icon="showPassword = !showPassword"
          />
        </div>
      </div>

      <div class="mt-3 flex items-center">
        <van-checkbox v-model="rememberPassword" icon-size="16px" checked-color="#0089ff">
          <span class="text-sm text-sub-text">{{ $t('rememberPassword') }}</span>
        </van-checkbox>
      </div>

      <div class="mt-16">
        <van-button
          :loading="loading"
          :disabled="!canSubmit"
          block
          type="primary"
          native-type="submit"
        >
          {{ $t('buttons.login') }}
        </van-button>
      </div>
    </van-form>

    <div class="mb-[32px] flex w-[300px] flex-col items-center text-xs">
      <div class="flex flex-row text-primary">
        <div class="text-sub-text">{{ $t('notHaveAccount') }}</div>
        <div @click="goRegister">{{ $t('nowRegister') }}</div>
      </div>
      <div class="text-sub-text">{{ version }}</div>
    </div>

    <van-popup v-model:show="showAreaCode" round position="bottom">
      <van-picker
        :columns="countryCode"
        @cancel="showAreaCode = false"
        @confirm="onConfirmAreaCode"
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
import { login } from '@/api/login'
import countryCode from '@/utils/areaCode'
import { setIMProfile } from '@/utils/storage'
import { feedbackToast } from '@/utils/common'
import { ensureIMLogin, resetIMLoginState } from '@/utils/imLogin'

const version = process.env.VERSION
type LoginMode = 'phone' | 'account'
const PHONE_PASSWORD_KEY = 'IMPhonePassword'
const PHONE_REMEMBER_KEY = 'IMPhoneRememberPassword'
const PHONE_AREA_CODE_KEY = 'IMPhoneAreaCode'
const ACCOUNT_PASSWORD_KEY = 'IMAccountPassword'
const ACCOUNT_REMEMBER_KEY = 'IMAccountRememberPassword'

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
  areaCode: localStorage.getItem(PHONE_AREA_CODE_KEY) ?? '+86',
  password: '',
})
const loading = ref(false)
const loginMode = ref<LoginMode>(getDefaultLoginMode())
const showAreaCode = ref(false)
const showPassword = ref(false)
const rememberPassword = ref(false)

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
  return !!formData.password
})

const applyRememberedPassword = (mode: LoginMode) => {
  if (mode === 'phone') {
    rememberPassword.value = localStorage.getItem(PHONE_REMEMBER_KEY) === 'true'
    formData.areaCode = localStorage.getItem(PHONE_AREA_CODE_KEY) ?? '+86'
    formData.password = rememberPassword.value
      ? localStorage.getItem(PHONE_PASSWORD_KEY) ?? ''
      : ''
    return
  }

  rememberPassword.value = localStorage.getItem(ACCOUNT_REMEMBER_KEY) === 'true'
  formData.password = rememberPassword.value
    ? localStorage.getItem(ACCOUNT_PASSWORD_KEY) ?? ''
    : ''
}

const switchLoginMode = (mode: LoginMode) => {
  loginMode.value = mode
  localStorage.setItem('IMLoginMode', mode)
  showPassword.value = false
  applyRememberedPassword(mode)
}

const persistRememberedPassword = () => {
  if (loginMode.value === 'account') {
    localStorage.setItem('IMAccountLogin', formData.account)
    if (rememberPassword.value) {
      localStorage.setItem(ACCOUNT_REMEMBER_KEY, 'true')
      localStorage.setItem(ACCOUNT_PASSWORD_KEY, formData.password)
    } else {
      localStorage.removeItem(ACCOUNT_REMEMBER_KEY)
      localStorage.removeItem(ACCOUNT_PASSWORD_KEY)
    }
    return
  }

  localStorage.setItem('IMPhoneNumber', formData.phoneNumber)
  localStorage.setItem(PHONE_AREA_CODE_KEY, formData.areaCode)
  if (rememberPassword.value) {
    localStorage.setItem(PHONE_REMEMBER_KEY, 'true')
    localStorage.setItem(PHONE_PASSWORD_KEY, formData.password)
  } else {
    localStorage.removeItem(PHONE_REMEMBER_KEY)
    localStorage.removeItem(PHONE_PASSWORD_KEY)
  }
}

const onSubmit = async () => {
  loading.value = true
  localStorage.setItem('IMLoginMode', loginMode.value)
  try {
    const {
      data: { chatToken, imToken, userID },
    } = await login({
      phoneNumber: loginMode.value === 'phone' ? formData.phoneNumber : '',
      password: md5(formData.password),
      areaCode: formData.areaCode,
      account: loginMode.value === 'account' ? formData.account : '',
    })

    persistRememberedPassword()
    setIMProfile({ chatToken, imToken, userID })
    resetIMLoginState()
    const isLogged = await ensureIMLogin()
    if (!isLogged) {
      throw new Error('IM login failed')
    }
    router.replace('/conversation')
  } catch (error) {
    feedbackToast({ message: t('messageTip.loginFailed'), error })
  }
  loading.value = false
}

const onConfirmAreaCode = ({ selectedValues }: PickerConfirmEventParams) => {
  formData.areaCode = String(selectedValues[0])
  showAreaCode.value = false
}

const goRegister = () => router.push({ path: 'getCode' })

applyRememberedPassword(loginMode.value)
</script>

<style lang="scss" scoped>
.page_container {
  background: linear-gradient(180deg,
      rgba(0, 137, 255, 0.1) 0%,
      rgba(255, 255, 255, 0) 100%);
}
</style>
