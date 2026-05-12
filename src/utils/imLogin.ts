import { IMSDK } from './imCommon'
import {
  getApiUrl,
  getIMToken,
  getIMUserID,
  getLogLevel,
  getWsUrl,
} from './storage'
import { LoginStatus } from '@openim/wasm-client-sdk'
import useUserStore from '@/store/modules/user'
import useConversationStore from '@/store/modules/conversation'
import useContactStore from '@/store/modules/contact'
import useAppConfigStore from '@/store/modules/appConfig'

const LOGIN_STATUS_RETRY_TIMES = 40
const LOGIN_STATUS_RETRY_DELAY = 300

let loginPromise: Promise<boolean> | null = null
let loginPromiseUserID = ''
let storeInitPromise: Promise<boolean> | null = null
let storeInitUserID = ''

const wait = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

const getCurrentCredentials = () => ({
  apiAddr: getApiUrl(),
  logLevel: Number(getLogLevel()),
  token: getIMToken(),
  userID: getIMUserID(),
  wsAddr: getWsUrl(),
})

export const resetIMLoginState = () => {
  loginPromise = null
  loginPromiseUserID = ''
  storeInitPromise = null
  storeInitUserID = ''
}

export const getIMLoginStatusSafe = async (): Promise<LoginStatus> => {
  try {
    const { data } = await IMSDK.getLoginStatus()
    return data
  } catch (error) {
    return LoginStatus.Logout
  }
}

const waitForLogged = async () => {
  for (let index = 0; index < LOGIN_STATUS_RETRY_TIMES; index += 1) {
    const status = await getIMLoginStatusSafe()
    if (status === LoginStatus.Logged) {
      return true
    }
    await wait(LOGIN_STATUS_RETRY_DELAY)
  }
  return false
}

export const ensureIMLogin = async () => {
  const { apiAddr, logLevel, token, userID, wsAddr } = getCurrentCredentials()

  if (!token || !userID) {
    resetIMLoginState()
    return false
  }

  if (loginPromise && loginPromiseUserID === userID) {
    return loginPromise
  }

  if (loginPromiseUserID !== userID) {
    resetIMLoginState()
  }

  loginPromiseUserID = userID
  loginPromise = (async () => {
    const currentStatus = await getIMLoginStatusSafe()

    if (currentStatus === LoginStatus.Logged) {
      return true
    }

    if (currentStatus === LoginStatus.Logging) {
      return waitForLogged()
    }

    try {
      await IMSDK.login({
        userID,
        token,
        apiAddr,
        wsAddr,
        platformID: 5,
        logLevel,
      })
    } catch (error) {
      console.error('IM login failed', error)
    }

    return waitForLogged()
  })().finally(() => {
    loginPromise = null
  })

  return loginPromise
}

const bootstrapIMStores = async () => {
  const userStore = useUserStore()
  const conversationStore = useConversationStore()
  const contactStore = useContactStore()
  const appConfigStore = useAppConfigStore()

  const tasks = [
    userStore.getSelfInfoFromReq(),
    conversationStore.getUnReadCountFromReq(),
    conversationStore.getConversationListFromReq(),
    contactStore.getFriendListFromReq(),
    contactStore.getGroupListFromReq(),
    contactStore.getBlackListFromReq(),
    contactStore.getRecvFriendApplicationListFromReq(),
    contactStore.getSendFriendApplicationListFromReq(),
    contactStore.getRecvGroupApplicationListFromReq(),
    contactStore.getSendGroupApplicationListFromReq(),
    appConfigStore.fetchAppConfig(true),
  ]

  await Promise.allSettled(tasks)

  return Boolean(userStore.storeSelfInfo.userID)
}

export const ensureIMReady = async () => {
  const { userID } = getCurrentCredentials()
  const isLogged = await ensureIMLogin()

  if (!isLogged || !userID) {
    return false
  }

  const userStore = useUserStore()
  if (userStore.storeSelfInfo.userID === userID) {
    return true
  }

  if (storeInitPromise && storeInitUserID === userID) {
    return storeInitPromise
  }

  if (storeInitUserID !== userID) {
    storeInitPromise = null
    storeInitUserID = ''
  }

  storeInitUserID = userID
  storeInitPromise = bootstrapIMStores().finally(() => {
    storeInitPromise = null
  })

  return storeInitPromise
}

export const setAppBackgroundStatusSafely = async (isBackground: boolean) => {
  const isReady = await ensureIMReady()
  if (!isReady) return

  try {
    await IMSDK.setAppBackgroundStatus(isBackground)
  } catch (error) {
    console.warn('Failed to update app background status', error)
  }
}
