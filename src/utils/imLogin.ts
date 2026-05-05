import { IMSDK } from './imCommon'
import {
  getApiUrl,
  getIMToken,
  getIMUserID,
  getLogLevel,
  getWsUrl,
} from './storage'
import { LoginStatus } from '@openim/wasm-client-sdk'

const LOGIN_STATUS_RETRY_TIMES = 40
const LOGIN_STATUS_RETRY_DELAY = 300

let loginPromise: Promise<boolean> | null = null
let loginPromiseUserID = ''

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

export const setAppBackgroundStatusSafely = async (isBackground: boolean) => {
  const isLogged = await ensureIMLogin()
  if (!isLogged) return

  try {
    await IMSDK.setAppBackgroundStatus(isBackground)
  } catch (error) {
    console.warn('Failed to update app background status', error)
  }
}
