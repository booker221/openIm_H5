export const setTMToken = (token: string) => localStorage.setItem('IM_TOKEN', token)
export const setChatToken = (token: string) =>
  localStorage.setItem('IM_CHAT_TOKEN', token)
export const setTMUserID = (userID: string) => localStorage.setItem('IM_USERID', userID)
export const setWsUrl = (url: string) => localStorage.setItem('wsUrl', url)
export const setApiUrl = (url: string) => localStorage.setItem('apiUrl', url)
export const setChatUrl = (url: string) => localStorage.setItem('chatUrl', url)
export const setSelectedHost = (host: string) =>
  localStorage.setItem('selectedHost', host)
export const setAccessedFriendApplication = (list: string[]) =>
  localStorage.setItem(
    `${getIMUserID()}_accessedFriendApplications`,
    JSON.stringify(list),
  )
export const setAccessedGroupApplication = (list: string[]) =>
  localStorage.setItem(
    `${getIMUserID()}_accessedGroupApplications`,
    JSON.stringify(list),
  )

const getCurrentConversationStorageKey = () =>
  `${getIMUserID() ?? 'guest'}_currentConversation`

export const setCurrentConversation = (conversation: unknown) =>
  localStorage.setItem(
    getCurrentConversationStorageKey(),
    JSON.stringify(conversation),
  )

export const getCurrentConversation = <T>() => {
  const value = localStorage.getItem(getCurrentConversationStorageKey())
  if (!value) {
    return undefined
  }

  try {
    return JSON.parse(value) as T
  } catch (error) {
    localStorage.removeItem(getCurrentConversationStorageKey())
    return undefined
  }
}

export const clearCurrentConversation = () =>
  localStorage.removeItem(getCurrentConversationStorageKey())

export const setIMProfile = ({ chatToken, imToken, userID }: any) => {
  setTMToken(imToken)
  setChatToken(chatToken)
  setTMUserID(userID)
}

export const clearIMProfile = () => {
  clearCurrentConversation()
  localStorage.removeItem('IM_TOKEN')
  localStorage.removeItem('IM_CHAT_TOKEN')
  localStorage.removeItem('IM_USERID')
  localStorage.removeItem('wsUrl')
  localStorage.removeItem('apiUrl')
  localStorage.removeItem('chatUrl')
  localStorage.removeItem('selectedHost')
}

export const getIMToken = () => localStorage.getItem('IM_TOKEN')
export const getChatToken = () => localStorage.getItem('IM_CHAT_TOKEN')
export const getIMUserID = () => localStorage.getItem('IM_USERID')
export const getSelectedHost = () => localStorage.getItem('selectedHost')
export const getAccessedFriendApplication = () =>
  localStorage.getItem(`${getIMUserID()}_accessedFriendApplications`)
    ? JSON.parse(localStorage.getItem(`${getIMUserID()}_accessedFriendApplications`)!)
    : []
export const getAccessedGroupApplication = () =>
  localStorage.getItem(`${getIMUserID()}_accessedGroupApplications`)
    ? JSON.parse(localStorage.getItem(`${getIMUserID()}_accessedGroupApplications`)!)
    : []

export const getWsUrl = () => localStorage.getItem('wsUrl') || process.env.WS_URL!
export const getApiUrl = () => localStorage.getItem('apiUrl') || process.env.API_URL!
export const getChatUrl = () => localStorage.getItem('chatUrl') || process.env.CHAT_URL!
export const getLogLevel = () =>
  localStorage.getItem('logLevel') || process.env.LOG_LEVEL!
