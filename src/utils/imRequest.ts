import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { feedbackToast } from './common'
import { ErrCodeMap } from '@/constants/errcode'
import { getApiUrl, getIMToken } from './storage'

type ErrorData = {
  errCode: number
  errMsg?: string
}

const imServices = axios.create({
  timeout: 10000,
})

imServices.interceptors.request.use(
  (config) => {
    config.baseURL = getApiUrl()
    config.headers = config.headers || {}
    config.headers.operationID = uuidv4()
    const token = getIMToken()
    if (token) {
      config.headers.token = token
    }
    return config
  },
  (err) => Promise.reject(err),
)

imServices.interceptors.response.use(
  (res) => {
    if (res.data.errCode !== 0) {
      const errData = res.data as ErrorData
      if (errData.errMsg) {
        feedbackToast({
          message: ErrCodeMap[errData.errCode],
          error: errData.errMsg,
        })
      }
      return Promise.reject(res.data)
    }
    return res.data
  },
  (err) => Promise.reject(err),
)

export default imServices
