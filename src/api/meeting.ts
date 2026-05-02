import imRequest from '@/utils/imRequest'

export type AnchorUserInfo = {
  userID: string
  nickname: string
  faceURL?: string
}

export type MeetingInfo = {
  meetingID: string
  subject: string
  coverURL?: string
  scheduledTime: number
  status: number
  description?: string
  duration: number
  enableMic: boolean
  enableComment: boolean
  anchorUsers: AnchorUserInfo[]
  groupID?: string
  checkInCount: number
  password?: string
  routePlan: number
}

export type MeetingListResponse = {
  total: number
  meetings: MeetingInfo[]
}

type GetMeetingsPublicParams = {
  status?: number
  keyword?: string
  startTime?: number
  endTime?: number
  pageNumber?: number
  showNumber?: number
}

export const getMeetingsPublic = ({
  status,
  keyword,
  startTime,
  endTime,
  pageNumber = 1,
  showNumber = 20,
}: GetMeetingsPublicParams = {}) =>
  imRequest.post<MeetingListResponse>(
    '/meeting/get_meetings_public',
    {
      pagination: {
        pageNumber,
        showNumber,
      },
      ...(status ? { status } : {}),
      ...(keyword ? { keyword } : {}),
      ...(startTime ? { startTime } : {}),
      ...(endTime ? { endTime } : {}),
    },
  )
