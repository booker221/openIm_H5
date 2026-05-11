import { getPicInfo } from '@/utils/common'
import { v4 as uuidV4 } from 'uuid'
import { MessageType } from '@openim/wasm-client-sdk'
import { IMSDK } from '@/utils/imCommon'
import type { MessageItem } from '@openim/wasm-client-sdk/lib/types/entity'

export default function useCreateFileMessage() {
  const sanitizeFileName = (name: string) =>
    name.replace(/[<>:"/\\|?*]/g, '_').trim() || `file-${Date.now()}`

  const getImageMessage = async (file: File): Promise<MessageItem> => {
    const { width, height } = await getPicInfo(file)
    const baseInfo = {
      uuid: uuidV4(),
      type: file.type,
      size: file.size,
      width,
      height,
      url: URL.createObjectURL(file),
    }
    const options = {
      sourcePicture: baseInfo,
      bigPicture: baseInfo,
      snapshotPicture: baseInfo,
      sourcePath: '',
      file,
    }
    return (await IMSDK.createImageMessageByFile(options)).data
  }

  const getFileMessage = async (file: File): Promise<MessageItem> => {
    const fileName = sanitizeFileName(file.name)
    const localUrl = URL.createObjectURL(file)
    return (
      await IMSDK.createFileMessageByFile({
        filePath: localUrl,
        fileName,
        uuid: uuidV4(),
        sourceUrl: localUrl,
        fileSize: file.size,
        fileType: file.type || undefined,
        file,
      })
    ).data
  }

  const createFileMessage = async (file: File, messageType: MessageType) => {
    switch (messageType) {
      case MessageType.PictureMessage:
        return {
          message: await getImageMessage(file),
        }
      case MessageType.FileMessage:
        return {
          message: await getFileMessage(file),
        }
      default:
        return {
          error: 'message type error',
        }
    }
  }

  return {
    createFileMessage,
  }
}
