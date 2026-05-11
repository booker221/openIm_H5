import { MessageType } from '@openim/wasm-client-sdk'
import type { MessageItem } from '@openim/wasm-client-sdk/lib/types/entity'
import { parseCallCustomMessage } from '@/utils/customMessage'

export const getMessagePreviewText = (message: Partial<MessageItem>) => {
  switch (message.contentType) {
    case MessageType.TextMessage:
      return message.textElem?.content ?? ''
    case MessageType.AtTextMessage:
      return message.atTextElem?.text ?? ''
    case MessageType.PictureMessage:
      return '[图片]'
    case MessageType.VideoMessage:
      return '[视频]'
    case MessageType.VoiceMessage:
      return '[语音]'
    case MessageType.FileMessage:
      return '[文件]'
    case MessageType.LocationMessage:
      return '[位置]'
    case MessageType.CustomMessage:
      return parseCallCustomMessage(message)?.content ?? '[消息]'
    case MessageType.CardMessage:
      return '[名片]'
    case MessageType.QuoteMessage:
      return message.quoteElem?.text ?? '[引用消息]'
    default:
      return '[消息]'
  }
}

export const buildFavoritePayload = (message: MessageItem) => {
  const payload: Record<string, unknown> = {}

  switch (message.contentType) {
    case MessageType.TextMessage:
      payload.type = 1
      payload.content = message.textElem?.content ?? ''
      payload.title = message.senderNickname ?? ''
      return payload
    case MessageType.AtTextMessage:
      payload.type = 1
      payload.content = message.atTextElem?.text ?? ''
      payload.title = message.senderNickname ?? ''
      return payload
    case MessageType.PictureMessage:
      payload.type = 2
      payload.content =
        message.pictureElem?.sourcePicture?.url ?? message.pictureElem?.sourcePath ?? ''
      payload.thumbnail = message.pictureElem?.snapshotPicture?.url ?? ''
      payload.title = message.senderNickname ?? ''
      payload.description = '图片'
      return payload
    case MessageType.CardMessage:
      payload.type = 1
      payload.content = `名片：${message.cardElem?.nickname ?? ''} (${message.cardElem?.userID ?? ''})`
      payload.title = message.senderNickname ?? ''
      payload.description = '名片'
      return payload
    case MessageType.FileMessage:
      payload.type = 4
      payload.content = message.fileElem?.sourceUrl ?? message.fileElem?.filePath ?? ''
      payload.title = message.fileElem?.fileName ?? message.senderNickname ?? ''
      payload.fileSize = message.fileElem?.fileSize ?? 0
      payload.description = '文件'
      return payload
    case MessageType.VoiceMessage:
      payload.type = 5
      payload.content = message.soundElem?.sourceUrl ?? message.soundElem?.soundPath ?? ''
      payload.title = message.senderNickname ?? ''
      payload.duration = message.soundElem?.duration ?? 0
      payload.description = '语音'
      return payload
    case MessageType.VideoMessage:
      payload.type = 6
      payload.content = message.videoElem?.videoUrl ?? message.videoElem?.videoPath ?? ''
      payload.thumbnail = message.videoElem?.snapshotUrl ?? message.videoElem?.snapshotPath ?? ''
      payload.title = message.senderNickname ?? ''
      payload.duration = message.videoElem?.duration ?? 0
      payload.fileSize = message.videoElem?.videoSize ?? 0
      payload.description = '视频'
      return payload
    case MessageType.LocationMessage:
      payload.type = 7
      payload.location = JSON.stringify({
        latitude: message.locationElem?.latitude ?? 0,
        longitude: message.locationElem?.longitude ?? 0,
        description: message.locationElem?.description ?? '',
      })
      payload.content = message.locationElem?.description ?? ''
      payload.title = message.senderNickname ?? ''
      payload.description = '位置'
      return payload
    case MessageType.QuoteMessage:
      payload.type = 1
      payload.content = message.quoteElem?.text ?? '[引用消息]'
      payload.title = message.senderNickname ?? ''
      payload.description = '引用消息'
      return payload
    default:
      return null
  }
}
