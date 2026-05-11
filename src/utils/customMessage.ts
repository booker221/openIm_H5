import { CustomMessageType } from '@/constants/enum'
import { i18n } from '@/i18n'
import { MessageType } from '@openim/wasm-client-sdk'
import type { MessageItem } from '@openim/wasm-client-sdk/lib/types/entity'

const { t } = i18n.global

export type CallMessageState =
  | 'hangup'
  | 'beHangup'
  | 'cancel'
  | 'beCanceled'
  | 'reject'
  | 'beRejected'
  | 'timeout'
  | 'networkError'

type CustomMessagePayload = {
  customType?: number
  data?: Record<string, unknown>
}

export type ParsedCallCustomMessage = {
  content: string
  duration: number
  state: string
  type: string
  viewType: number
}

export const parseCustomMessagePayload = (
  message: Partial<MessageItem>,
): CustomMessagePayload | null => {
  if (
    message.contentType !== MessageType.CustomMessage ||
    !message.customElem?.data
  ) {
    return null
  }

  try {
    return JSON.parse(message.customElem.data) as CustomMessagePayload
  } catch (error) {
    return null
  }
}

export const formatCallDuration = (duration: number) => {
  const safeDuration = Math.max(0, Number(duration) || 0)
  const hours = Math.floor(safeDuration / 3600)
  const minutes = Math.floor((safeDuration % 3600) / 60)
  const seconds = safeDuration % 60

  const minuteSegment = `${minutes}`.padStart(2, '0')
  const secondSegment = `${seconds}`.padStart(2, '0')

  if (!hours) {
    return `${minuteSegment}:${secondSegment}`
  }

  return `${`${hours}`.padStart(2, '0')}:${minuteSegment}:${secondSegment}`
}

export const getCallMessageText = (
  state?: string,
  duration = 0,
): string | undefined => {
  switch (state) {
    case 'hangup':
    case 'beHangup':
      return `${t('rtc.callDuration')} ${formatCallDuration(duration)}`
    case 'cancel':
      return t('rtc.canceled')
    case 'beCanceled':
      return t('rtc.canceledByCaller')
    case 'reject':
      return t('rtc.refused')
    case 'beRejected':
      return t('rtc.rejectedByCaller')
    case 'timeout':
      return t('rtc.timeout')
    case 'networkError':
      return t('rtc.networkError')
    default:
      return undefined
  }
}

export const parseCallCustomMessage = (
  message: Partial<MessageItem>,
): ParsedCallCustomMessage | null => {
  const payload = parseCustomMessagePayload(message)

  if (payload?.customType !== CustomMessageType.Call) {
    return null
  }

  const duration = Number(payload.data?.duration ?? 0)
  const state = String(payload.data?.state ?? '')
  const type = String(payload.data?.type ?? 'audio')
  const content = getCallMessageText(state, duration)

  if (!content) {
    return null
  }

  return {
    content,
    duration,
    state,
    type,
    viewType: CustomMessageType.Call,
  }
}

export const buildCallCustomMessageData = ({
  duration,
  state,
  type,
}: {
  duration: number
  state: CallMessageState
  type: string
}) =>
  JSON.stringify({
    customType: CustomMessageType.Call,
    data: {
      duration,
      state,
      type,
    },
  })
