<template>
  <div class="page_container login_page">
    <div class="login_page__content">
      <div class="login_page__brand">
        <img class="login_page__logo" :src="logo" alt="" />
        <div class="login_page__title">{{ welcomeText }}</div>
      </div>

      <van-form class="login_page__form" @submit="onSubmit">
        <div class="login_page__tabs">
          <button
            v-for="item in loginModeOptions"
            :key="item.value"
            type="button"
            class="login_page__tab"
            :class="{ 'login_page__tab--active': loginMode === item.value }"
            @click="switchLoginMode(item.value)"
          >
            {{ item.label }}
          </button>
        </div>

        <div
          v-if="loginMode === 'phone'"
          class="login_page__field login_page__field--phone"
        >
          <button
            type="button"
            class="login_page__area_code"
            @click="showAreaCode = true"
          >
            <span>{{ formData.areaCode }}</span>
            <van-icon name="arrow-down" size="18" color="#0C1C33" />
          </button>
          <div class="login_page__field_divider"></div>
          <van-field
            v-model="formData.phoneNumber"
            name="phoneNumber"
            type="number"
            :border="false"
            :placeholder="$t('placeholder.inputPhoneNumber')"
          />
        </div>

        <div v-else class="login_page__field">
          <van-field
            v-model="formData.account"
            name="account"
            :border="false"
            :placeholder="$t('placeholder.inputAccount')"
          />
        </div>

        <div class="login_page__field login_page__field--password">
          <van-field
            v-model="formData.password"
            name="password"
            :border="false"
            :type="showPassword ? 'text' : 'password'"
            :right-icon="showPassword ? 'eye-o' : 'closed-eye'"
            :placeholder="$t('placeholder.inputPassword')"
            @click-right-icon="showPassword = !showPassword"
          />
        </div>

        <div class="login_page__action_row">
          <van-checkbox
            v-model="rememberPassword"
            shape="square"
            icon-size="20px"
            checked-color="#0089FF"
          >
            <span class="login_page__remember_text">{{ $t('rememberPassword') }}</span>
          </van-checkbox>

          <div class="login_page__links">
            <button
              type="button"
              class="login_page__link login_page__link--muted"
              @click="handleForgotPassword"
            >
              {{ $t('forgotPassword') }}
            </button>
            <button
              type="button"
              class="login_page__link login_page__link--primary"
              @click="goRegister"
            >
              {{ $t('nowRegister') }}
            </button>
          </div>
        </div>

        <van-button
          :loading="loading"
          :disabled="!canSubmit"
          block
          type="primary"
          native-type="submit"
          class="login_page__submit"
          :color="canSubmit ? '#5AB7FF' : '#9FD7FF'"
        >
          {{ $t('buttons.login') }}
        </van-button>
      </van-form>

      <button
        v-if="hasLineSwitch"
        type="button"
        class="login_page__line_switch"
        @click="showLinePopup = true"
      >
        <van-icon name="replay" size="14" color="#8E9AB0" />
        <span class="ml-2 text-sub-text">{{ currentLinePrefix }}</span>
        <span class="ml-1 text-[#0C1C33]">{{ currentLineLabel }}</span>
        <span class="ml-2 text-primary">{{ $t('switchText') }}</span>
      </button>
    </div>

    <van-popup
      v-model:show="showLinePopup"
      round
      position="bottom"
      class="line_popup"
      @open="startLineSpeedDetection"
    >
      <div class="px-5 pb-6 pt-5">
        <div class="flex items-center justify-between">
          <div class="text-[18px] font-semibold text-[#0C1C33]">
            {{ $t('lineSwitchTitle') }}
          </div>
          <van-icon
            name="cross"
            size="22"
            color="#8E9AB0"
            @click="showLinePopup = false"
          />
        </div>
        <div class="mt-3 text-sm text-sub-text">{{ $t('lineSwitchDesc') }}</div>

        <div class="mt-4 overflow-hidden rounded-[14px] bg-[#F8F9FA]">
          <button
            v-for="(host, index) in availableHosts"
            :key="host"
            type="button"
            class="line_row"
            :class="{ 'line_row--active': host === currentLineHost }"
            @click="switchLine(host, index)"
          >
            <div class="flex items-center">
              <span class="text-[18px] font-medium text-[#0C1C33]">
                {{ getLineLabel(index) }}
              </span>
              <span
                v-if="host === currentLineHost"
                class="ml-2 text-xs font-medium text-primary"
              >
                {{ $t('lineCurrent') }}
              </span>
            </div>

            <div class="line_speed_tag">
              <van-loading
                v-if="lineSpeedResults[host] === null"
                size="12"
                color="#0089FF"
              />
              <span
                class="ml-1"
                :class="{
                  'text-[#FF381F]': (lineSpeedResults[host] ?? 0) >= 999999,
                  'text-[#8E9AB0]': lineSpeedResults[host] !== null,
                }"
              >
                {{ getLineSpeedStatus(host) }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </van-popup>

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
import logo from '@assets/images/logo.png'
import md5 from 'md5'
import type { PickerConfirmEventParams } from 'vant'
import { showToast } from 'vant'
import { login } from '@/api/login'
import countryCode from '@/utils/areaCode'
import { feedbackToast } from '@/utils/common'
import { ensureIMLogin, resetIMLoginState } from '@/utils/imLogin'
import { applyLineHost, getAvailableHosts, getCurrentLineHost, testHostLatency } from '@/utils/lineSwitch'
import { clearIMProfile, setIMProfile } from '@/utils/storage'

type LoginMode = 'phone' | 'account'

const APP_NAME_FALLBACK = '集中营'
const PHONE_PASSWORD_KEY = 'IMPhonePassword'
const PHONE_REMEMBER_KEY = 'IMPhoneRememberPassword'
const PHONE_AREA_CODE_KEY = 'IMPhoneAreaCode'
const ACCOUNT_PASSWORD_KEY = 'IMAccountPassword'
const ACCOUNT_REMEMBER_KEY = 'IMAccountRememberPassword'

const version = process.env.VERSION
const { t } = useI18n()
const router = useRouter()

const resolveAppDisplayName = () => {
  const candidates = [document.title, version]
    .map((value) => value?.trim())
    .filter((value): value is string => !!value && value !== 'H5-Demo')

  return candidates[0] || APP_NAME_FALLBACK
}

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
const showLinePopup = ref(false)
const availableHosts = ref<string[]>(getAvailableHosts())
const currentLineHost = ref(getCurrentLineHost() || availableHosts.value[0] || '')
const lineSpeedResults = ref<Record<string, number | null>>({})
let lineDetectTaskId = 0

const welcomeText = computed(() =>
  t('welcome', {
    appName: resolveAppDisplayName(),
  }),
)

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

const hasLineSwitch = computed(() => availableHosts.value.length > 0)
const currentLinePrefix = computed(() => `${t('lineCurrent')}:`)
const currentLineLabel = computed(() => {
  if (!currentLineHost.value) {
    return t('lineUnavailable')
  }

  const index = availableHosts.value.findIndex((host) => host === currentLineHost.value)
  if (index > -1) {
    return getLineLabel(index)
  }

  return currentLineHost.value
})

const getLineLabel = (index: number) => t('lineLabel', { index: index + 1 })

const getLineSpeedStatus = (host: string) => {
  const speed = lineSpeedResults.value[host]
  if (speed === null || speed === undefined) {
    return t('lineChecking')
  }
  if (speed >= 999999) {
    return t('lineUnavailable')
  }
  return `${speed}ms`
}

const startLineSpeedDetection = async () => {
  if (!availableHosts.value.length) return

  const taskId = ++lineDetectTaskId
  lineSpeedResults.value = Object.fromEntries(
    availableHosts.value.map((host) => [host, null]),
  )

  for (const host of availableHosts.value) {
    const speed = await testHostLatency(host)
    if (taskId !== lineDetectTaskId) {
      return
    }
    lineSpeedResults.value = {
      ...lineSpeedResults.value,
      [host]: speed,
    }
  }
}

const switchLine = async (host: string, index: number) => {
  if (host === currentLineHost.value) {
    showLinePopup.value = false
    return
  }

  applyLineHost(host)
  resetIMLoginState()
  availableHosts.value = getAvailableHosts()
  currentLineHost.value = host
  showLinePopup.value = false
  feedbackToast({
    message: t('messageTip.lineSwitched', {
      line: getLineLabel(index),
    }),
  })
}

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
    clearIMProfile()
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

const handleForgotPassword = () => {
  showToast({
    type: 'fail',
    message: t('messageTip.featureNotSupportedOnH5'),
  })
}

const onConfirmAreaCode = ({ selectedValues }: PickerConfirmEventParams) => {
  formData.areaCode = String(selectedValues[0])
  showAreaCode.value = false
}

const goRegister = () => router.push({ path: 'getCode' })

watch(showLinePopup, (show) => {
  if (!show) {
    lineDetectTaskId += 1
  }
})

onBeforeUnmount(() => {
  lineDetectTaskId += 1
})

applyRememberedPassword(loginMode.value)
</script>

<style lang="scss" scoped>
.login_page {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  background: linear-gradient(180deg, #e6f3ff 0%, #f9fcff 44%, #ffffff 100%);
  -webkit-overflow-scrolling: touch;
}

.login_page__content {
  display: flex;
  width: 100%;
  max-width: 556px;
  box-sizing: border-box;
  min-height: 100%;
  margin: 0 auto;
  align-items: center;
  flex-direction: column;
  padding: 72px 30px 24px;
  padding-bottom: calc(24px + constant(safe-area-inset-bottom));
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.login_page__brand {
  display: flex;
  width: 100%;
  max-width: 496px;
  flex-direction: column;
  align-items: center;
}

.login_page__logo {
  width: 78px;
  height: 78px;
}

.login_page__title {
  margin-top: 12px;
  color: #0089ff;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
}

.login_page__form {
  display: flex;
  flex: 1;
  width: 100%;
  max-width: 496px;
  flex-direction: column;
  margin-top: 68px;
}

.login_page__tabs {
  display: flex;
  gap: 26px;
  border-bottom: 1px solid #d8e3f0;
}

.login_page__tab {
  position: relative;
  padding-bottom: 14px;
  color: #4f5b70;
  font-size: 16px;
  font-weight: 500;
}

.login_page__tab--active {
  color: #0089ff;
}

.login_page__tab--active::after {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 3px;
  border-radius: 999px;
  background: #0089ff;
  content: '';
}

.login_page__field {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  min-height: 56px;
  margin-top: 24px;
  border: 1px solid #d8e3f0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  padding: 0 16px;
}

.login_page__field--phone {
  padding-left: 0;
}

.login_page__field--password {
  margin-top: 18px;
}

.login_page__area_code {
  display: flex;
  min-width: 92px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #0c1c33;
  font-size: 17px;
  font-weight: 500;
}

.login_page__field_divider {
  width: 1px;
  height: 28px;
  background: #d8e3f0;
}

.login_page__action_row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  gap: 12px;
}

.login_page__remember_text {
  color: #8e9ab0;
  font-size: 14px;
}

.login_page__links {
  display: flex;
  align-items: center;
  gap: 18px;
}

.login_page__link {
  font-size: 14px;
}

.login_page__link--muted {
  color: #8e9ab0;
}

.login_page__link--primary {
  color: #0089ff;
}

.login_page__submit {
  height: 52px;
  margin-top: auto;
  border: none !important;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
}

.login_page__line_switch {
  display: flex;
  width: 100%;
  max-width: 496px;
  align-items: center;
  justify-content: center;
  margin-top: 22px;
  color: #8e9ab0;
  font-size: 14px;
}

.line_row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: transparent;
}

.line_row + .line_row {
  border-top: 1px solid #e8eef5;
}

.line_row--active {
  background: rgba(0, 137, 255, 0.08);
}

.line_speed_tag {
  display: flex;
  align-items: center;
  min-width: 56px;
  justify-content: flex-end;
  font-size: 13px;
}

:deep(.login_page__field .van-cell) {
  padding: 0;
  background: transparent;
  flex: 1;
}

:deep(.login_page__field .van-field__body) {
  min-height: 54px;
}

:deep(.login_page__field .van-field__control) {
  color: #0c1c33;
  font-size: 17px;
}

:deep(.login_page__field .van-field__control::placeholder) {
  color: #9aa6bc;
}

:deep(.login_page__field .van-field__right-icon) {
  color: #a7b2c5;
  font-size: 22px;
}

:deep(.login_page__action_row .van-checkbox__label) {
  margin-left: 8px;
}

@media (max-width: 375px) {
  .login_page__content {
    padding-right: 20px;
    padding-left: 20px;
  }

  .login_page__links {
    gap: 12px;
  }
}

@media (max-height: 720px) {
  .login_page__content {
    padding-top: 44px;
  }

  .login_page__form {
    margin-top: 44px;
  }
}
</style>
