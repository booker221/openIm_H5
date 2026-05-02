import request from '@utils/request'
import { getChatToken } from '@/utils/storage'

export type AppConfigData = {
  friends_switch?: boolean
  groups_switch?: boolean
  meeting?: boolean
  wallet?: boolean
  sms_type?: boolean | string
  withdraw_limit?: string
  ['live.api']?: string
  ['live.ws']?: string
  ['message.ws']?: string
  livecloud?: string
}

export const getAppConfigs = () => {
  const token = getChatToken()
  return request.post<AppConfigData>(
    '/system_config/get_app_configs',
    JSON.stringify({}),
    {
      headers: token ? { token } : {},
    },
  )
}
