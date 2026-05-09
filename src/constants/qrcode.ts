export const OPENIM_FRIEND_QR_SCHEME = 'io.openim.app/addFriend/'
export const OPENIM_GROUP_QR_SCHEME = 'io.openim.app/joinGroup/'

export type OpenIMQrCodeResult = {
  type: 'friend' | 'group'
  id: string
}

const normalizeQrCodeId = (value: string) => {
  const id = value.split(/[/?#&]/)[0]?.trim()
  return id || null
}

const extractIdByPrefix = (content: string, prefix: string) => {
  if (!content.startsWith(prefix)) return null
  return normalizeQrCodeId(content.slice(prefix.length))
}

const extractGroupIdFromUrl = (content: string) => {
  const uri = (() => {
    try {
      return new URL(content)
    } catch (error) {
      return null
    }
  })()

  const queryId =
    uri?.searchParams.get('groupID') ||
    uri?.searchParams.get('groupId') ||
    uri?.searchParams.get('group')

  if (queryId?.trim()) {
    return queryId.trim()
  }

  const match = content.match(/(?:joinGroup|group)[=/]([^/?#&]+)/i)
  return normalizeQrCodeId(match?.[1] ?? '')
}

const extractUserIdFromUrl = (content: string) => {
  const uri = (() => {
    try {
      return new URL(content)
    } catch (error) {
      return null
    }
  })()

  const queryId =
    uri?.searchParams.get('userID') ||
    uri?.searchParams.get('userId') ||
    uri?.searchParams.get('friendID') ||
    uri?.searchParams.get('friendId') ||
    uri?.searchParams.get('user') ||
    uri?.searchParams.get('friend')

  if (queryId?.trim()) {
    return queryId.trim()
  }

  const match = content.match(/(?:addFriend|user|friend)[=/]([^/?#&]+)/i)
  return normalizeQrCodeId(match?.[1] ?? '')
}

export const buildFriendQrCodeContent = (userID: string) =>
  `${OPENIM_FRIEND_QR_SCHEME}${userID}`

export const buildGroupQrCodeContent = (groupID: string) =>
  `${OPENIM_GROUP_QR_SCHEME}${groupID}`

export const parseOpenIMQrCode = (rawContent: string): OpenIMQrCodeResult | null => {
  const content = rawContent.trim()
  if (!content) return null

  const groupID = extractIdByPrefix(content, OPENIM_GROUP_QR_SCHEME)
  if (groupID) {
    return {
      type: 'group',
      id: groupID,
    }
  }

  const userID = extractIdByPrefix(content, OPENIM_FRIEND_QR_SCHEME)
  if (userID) {
    return {
      type: 'friend',
      id: userID,
    }
  }

  const lowerContent = content.toLowerCase()

  if (lowerContent.includes('group')) {
    const id = extractGroupIdFromUrl(content)
    if (id) {
      return {
        type: 'group',
        id,
      }
    }
  }

  if (lowerContent.includes('user') || lowerContent.includes('friend')) {
    const id = extractUserIdFromUrl(content)
    if (id) {
      return {
        type: 'friend',
        id,
      }
    }
  }

  return null
}
