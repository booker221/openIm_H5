export const OPENIM_FRIEND_QR_PREFIX = 'io.openim.app/addFriend/'
export const OPENIM_GROUP_QR_PREFIX = 'io.openim.app/joinGroup/'

type QRTargetType = 'friend' | 'group'

export type ParsedOpenIMQrCode = {
  type: QRTargetType
  id: string
}

const normalizeQRCodeId = (value: string) => {
  const normalized = value.split(/[/?#&]/)[0]?.trim()
  return normalized || ''
}

const extractIdByPrefix = (content: string, prefix: string) => {
  if (!content.startsWith(prefix)) return ''
  return normalizeQRCodeId(content.slice(prefix.length))
}

const extractGroupIdFromUrl = (content: string) => {
  const url = new URL(content)
  return (
    url.searchParams.get('groupID') ||
    url.searchParams.get('groupId') ||
    url.searchParams.get('group') ||
    normalizeQRCodeId(
      content.match(/(?:joinGroup|group)[=/]([^/?#&]+)/i)?.[1] ?? '',
    )
  )
}

const extractUserIdFromUrl = (content: string) => {
  const url = new URL(content)
  return (
    url.searchParams.get('userID') ||
    url.searchParams.get('userId') ||
    url.searchParams.get('friendID') ||
    url.searchParams.get('friendId') ||
    url.searchParams.get('user') ||
    url.searchParams.get('friend') ||
    normalizeQRCodeId(
      content.match(/(?:addFriend|user|friend)[=/]([^/?#&]+)/i)?.[1] ?? '',
    )
  )
}

export const buildFriendQrContent = (userID: string) =>
  `${OPENIM_FRIEND_QR_PREFIX}${userID}`

export const buildGroupQrContent = (groupID: string) =>
  `${OPENIM_GROUP_QR_PREFIX}${groupID}`

export const parseOpenIMQrCode = (rawContent: string): ParsedOpenIMQrCode | null => {
  const content = rawContent.trim()
  if (!content) return null

  const groupID = extractIdByPrefix(content, OPENIM_GROUP_QR_PREFIX)
  if (groupID) {
    return {
      type: 'group',
      id: groupID,
    }
  }

  const userID = extractIdByPrefix(content, OPENIM_FRIEND_QR_PREFIX)
  if (userID) {
    return {
      type: 'friend',
      id: userID,
    }
  }

  try {
    const lowerContent = content.toLowerCase()

    if (lowerContent.includes('group')) {
      const urlGroupID = extractGroupIdFromUrl(content)
      if (urlGroupID) {
        return {
          type: 'group',
          id: normalizeQRCodeId(urlGroupID),
        }
      }
    }

    if (lowerContent.includes('user') || lowerContent.includes('friend')) {
      const urlUserID = extractUserIdFromUrl(content)
      if (urlUserID) {
        return {
          type: 'friend',
          id: normalizeQRCodeId(urlUserID),
        }
      }
    }
  } catch (error) {
    console.error('Failed to parse qr code url', error)
  }

  return null
}
