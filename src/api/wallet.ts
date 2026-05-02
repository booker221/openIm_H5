import request from '@utils/request'
import {
  RealNameAuthResult,
  WalletBalanceData,
  WalletInfoData,
} from './data'
import { getChatToken } from '@/utils/storage'

const getTokenHeaders = () => {
  const token = getChatToken()
  return {
    headers: token ? { token } : {},
  }
}

export const getWalletBalance = () =>
  request.post<WalletBalanceData>('/wallet/balance', JSON.stringify({}), getTokenHeaders())

export const getWalletInfo = () =>
  request.post<WalletInfoData>('/wallet/info', JSON.stringify({}), getTokenHeaders())

export const setWithdrawAccount = (account: string, accountType = 1) =>
  request.post(
    '/wallet/withdraw_account/set',
    JSON.stringify({
      account,
      accountType,
    }),
    getTokenHeaders(),
  )

export const realNameAuth = (params: {
  idCard: string
  name: string
  idCardPhotoFront?: string
  idCardPhotoBack?: string
}) =>
  request.post<RealNameAuthResult>(
    '/wallet/real_name_auth',
    JSON.stringify({
      ...params,
    }),
    getTokenHeaders(),
  )
