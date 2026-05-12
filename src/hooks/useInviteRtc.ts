import useUserStore from '@/store/modules/user'
import useConversationStore from '@/store/modules/conversation'
import { v4 as uuidV4 } from 'uuid'
import { SessionType } from '@openim/wasm-client-sdk'
import emitter from '@/utils/events'
import { feedbackToast } from '@/utils/common'
import { getMediaCaptureSupportIssue } from '@/utils/mediaCapture'
import { i18nt } from '@/i18n'
import { ChatFooterActionType } from '@/constants/action'
import type { ParticipantInfo } from '@/pages/rtc/data'

type InviteRtcOptions = {
  participant?: ParticipantInfo
}

export const useInviteRtc = () => {
  const userStore = useUserStore()
  const conversationStore = useConversationStore()

  const inviteRtc = async (
    type: ChatFooterActionType,
    userIDList: string[],
    options?: InviteRtcOptions,
  ) => {
    const captureSupportIssue = getMediaCaptureSupportIssue()
    if (captureSupportIssue) {
      feedbackToast({
        message: i18nt(
          captureSupportIssue === 'insecure_context'
            ? 'rtc.mediaSecureContext'
            : 'rtc.mediaUnsupported',
        ),
        error: true,
      })
      return
    }

    const mediaType = type === ChatFooterActionType.VoiceCall ? 'audio' : 'video'
    const participant =
      options?.participant ?? {
        userInfo: {
          nickname: conversationStore.currentConversation.showName,
          userID: conversationStore.currentConversation.userID,
          faceURL: conversationStore.currentConversation.faceURL,
          ex: '',
        },
      }

    emitter.emit('OPEN_RTC_MODAL', {
      invitation: {
        inviterUserID: userStore.selfInfo.userID,
        inviteeUserIDList: userIDList,
        groupID: '',
        roomID: uuidV4(),
        timeout: 60,
        mediaType,
        sessionType: SessionType.Single,
        platformID: 5,
      },
      participant,
    })
  }

  return {
    inviteRtc,
  }
}
